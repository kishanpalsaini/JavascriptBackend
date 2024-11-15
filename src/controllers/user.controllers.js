import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {ApiResponse} from '../utils/ApiResponse.js'
import {User} from '../models/user.models.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'


const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}    
    } catch (error) {
        throw new ApiError(500, "Failed to generate access token")
    }
    
}

const registerUser = asyncHandler(async(req, res) => {

    // get the user data from request body
    // validate the user input
    // check if the user already exists : username, email
    // check for image, check for avatar
    // uploade them on cloudinary, avatar
    // create the user in database
    // revome the password and refresh token feilds from response
    // check for user creation
    // save the user
    // send the response
    const {fullName, userName, email, password} = req.body;

    console.log("email:", email);
        // if(fullName === "" || userName === "" || email === "" || password === ""){

        // }
        // or
        if(
            [fullName, userName, email, password].some((field) => field?.trim() === "")
        ){
            return new ApiError(400, "Please fill in all fields")
        }

    const existedUser = await User.findOne({$or: [{userName}, {email}]})

    if(existedUser){
        throw new ApiError(400, "userName or email already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath =  (req?.files && req.files?.coverImage[0]) ? req.files?.coverImage[0]?.path : null;

    let coverImageLocalPath = '';
    if(req.files && Array.isArray(req.files?.coverImage) && req.files?.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }
     
    if(!avatarLocalPath){
        throw new ApiError(400, "Please upload avatar and cover image")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(500, "Failed to upload image")
    }

    const user = await User.create({
        fullName,
        userName: userName.toLowerCase(),
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    })

    // const createdUser = await User.findById(user._id).select("-password -refreshToken")

    console.log("user._id :", user);
    

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if(!createdUser){
        throw new ApiError(500, "Something went wrong!! Failed to create user")
    }

    

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User created successfully")
    )
})

const loginUser = asyncHandler(async(req, res) => {
    // get the user data from request body
    // validate the user input
    // check if the user exists
    // check if the password is correct
    // generate access token
    // save the refresh token in database
    // send the response

    const {email, userName, password} = req.body;

    if(!email && !userName){
        throw new ApiError(400, "Please provide email or userName")
    }

    const user = await User.findOne({$or: [{email}, {userName}]}).select("+password")

    if(!user){
        throw new ApiError(404, "User not found")
    }

    const isPasswordCorrect = await user.isPasswordCorrect(password)

    if(!isPasswordCorrect){
        throw new ApiError(401, "Invalid credentials")
    }

    const {accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id)

    const loginUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200, {
            user: loginUser,
            accessToken,
            refreshToken
        }, "User logged in successfully")
    )

})

const logOut = asyncHandler(async(req, res) => {
    
})

export {registerUser, loginUser}