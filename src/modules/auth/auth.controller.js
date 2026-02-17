const authService = require("./auth.service");
const { deleteChatHistory } = require("../ai/chatbot/chat.service")

async function register(req, res) {
  try {
    const { token, user } = await authService.registerUser(req.body);

    // res.cookie("access_token", token, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production",
    //   sameSite: "none",
    //   domain: process.env.NODE_ENV === "production" ? ".numor.app" : "localhost",
    //   maxAge: 7 * 24 * 60 * 60 * 1000,
    // });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        token,
        // user 
      },
    });
  } catch (error) {
    // res.clearCookie("access_token");
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    const { token, safeUser } = await authService.loginUser(email, password);

    // res.cookie("access_token", token, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production",
    //   sameSite: "none", // or "lax"
    //   // domain: process.env.NODE_ENV === "production" ? ".numor.app" : "localhost",
    //   maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    // });

    res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        safeUser, // safe user info
      },
    });
  } catch (error) {
    // res.clearCookie("access_token");
    res.status(401).json({
      success: false,
      message: error.message,
    });
  }
}

async function logout(req, res) {
  // res.clearCookie("access_token", {
  //   httpOnly: true,
  //   secure: process.env.NODE_ENV === "production",
  //   sameSite: "none",
  //   // domain: ".numor.app",
  // });
  try {
    const result = await deleteChatHistory(req.user);

    res.json({
      success: true,
      message: "Logout successful. Chat history cleared.",
      result
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
}

async function googleLogin(req, res, next) {
  try {
    const { code, user_type_for_signup } = req.body;
    const { token, user } = await authService.googleAuth(code, user_type_for_signup);

    // res.cookie("access_token", token, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production",
    //   sameSite: "none",
    //   // domain: process.env.NODE_ENV === "production" ? ".numor.app" : "localhost",
    //   maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    // });
    res.json({
      success: true,
      message: "Google login successful",
      data: {
        token,
        user,
      },
    });
  } catch (err) {
    // res.clearCookie("access_token");
    next(err);
  }
}

module.exports = {
  register,
  login,
  logout,
  googleLogin
};