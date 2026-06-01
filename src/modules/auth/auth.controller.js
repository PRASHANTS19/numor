const authService = require("./auth.service");
const { deleteChatHistory } = require("../ai/chatbot/chat.service")
const { sendResponse } = require("../../utils/response");

async function register(req, res, next) {
  try {
    const { token, user } = await authService.registerUser(req.body);

    // res.cookie("access_token", token, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production",
    //   sameSite: "none",
    //   domain: process.env.NODE_ENV === "production" ? ".numor.app" : "localhost",
    //   maxAge: 7 * 24 * 60 * 60 * 1000,
    // });

    return sendResponse(res, 201, {
      message: "User registered successfully",
      data: {
        token,
        // user 
      },
    });
  } catch (error) {
    // res.clearCookie("access_token");
    console.error("Registration error:", error);
    error.statusCode = error.statusCode || 400;
    error.message = error.message || "Registration failed";
    next(error);
  }
}

async function login(req, res, next) {
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

    return sendResponse(res, 200, {
      message: "Login successful",
      data: {
        token,
        safeUser, // safe user info
      },
    });
  } catch (error) {
    // res.clearCookie("access_token");
    console.error("Login error:", error.message);
    const authError = new Error("Invalid email or password");
    authError.statusCode = 401;
    next(authError);
  }
}

async function logout(req, res, next) {
  // res.clearCookie("access_token", {
  //   httpOnly: true,
  //   secure: process.env.NODE_ENV === "production",
  //   sameSite: "none",
  //   // domain: ".numor.app",
  // });
  try {
    const result = await deleteChatHistory(req.user);

    return sendResponse(res, 200, {
      message: "Logout successful. Chat history cleared.",
      data: { result }
    });
  } catch (error) {
    console.error("Logout error:", error);
    error.message = error.message || "Logout failed";
    next(error);
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
    return sendResponse(res, 200, {
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


async function linkedinLogin(req, res, next) {
  try {
    const { code, user_type_for_signup } = req.body;

    const { token, user } = await authService.linkedinAuth(
      code,
      user_type_for_signup
    );

    return sendResponse(res, 200, {
      message: "LinkedIn login successful",
      data: {
        token,
        user,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function googleLocalStorageBasedLogin(req, res, next) {
  const { state, code } = req.query;
  let user_type_for_signup = undefined;

  if (state) {
    try {
      const parsed = JSON.parse(Buffer.from(state, "base64").toString());
      user_type_for_signup = parsed.user_type_for_signup;
    }
    catch (err) {
      console.error("Failed to parse state parameter:", err);
      err.statusCode = 400;
      err.message = "Invalid state parameter";
      return next(err);
    }
  }

  try {

    const { token, user } = await authService.googleAuth(code, user_type_for_signup);

    let frontendUrl;
    switch (process.env.FRONTEND_URL) {
      case "PRODUCTION":
        frontendUrl = process.env.FRONTEND_URL_PRODUCTION;
        break;
      case "LOVABLE":
        frontendUrl = process.env.FRONTEND_URL_LOVABLE;
        break;
      default:
        frontendUrl = process.env.FRONTEND_URL_LOCAL;
    }

    const redirectPath = user?.role === "CA_USER" ? "/ca/dashboard" : "/sme/dashboard";

    // Token in hash fragment so it's never sent to servers
    res.redirect(`${frontendUrl}/auth/callback#token=${token}&redirect=${redirectPath}`);
  }
  catch (err) {
    console.error("Google auth failed:", err);
    const frontendUrl = process.env.FRONTEND_URL;
    res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
  }

}

async function verifyEmail(req, res, next) {
  try {
    const { email } = req.body;

    const result = await authService.verifyEmail(email);

    return sendResponse(res, 200, {
      success: result.success,
      data: { result }
    });
  } catch (error) {
    console.log("Email verification error:", error);
    error.statusCode = error.statusCode || 400;
    next(error);
  }
}

async function verifyEmailOtp(req, res, next) {
  try {
    const { email, code } = req.body;

    const result = await authService.verifyEmailOTP(email, code);

    return sendResponse(res, 200, {
      message: "Verification Successful",
      data: { result }
    });
  } catch (error) {
    error.statusCode = error.statusCode || 400;
    next(error);
  }
}

async function forgetPassword(req, res, next) {
  try {
    const { email } = req.body;

    const result = await authService.forgetPassword(email);

    return sendResponse(res, 200, {
      message: "Verification code sent to email",
      data: { result }
    });
  } catch (error) {
    error.statusCode = error.statusCode || 400;
    next(error);
  }
}

async function verifyCode(req, res, next) {
  try {
    const { email, code } = req.body;

    await authService.verifyResetCode(email, code);

    return sendResponse(res, 200, {
      message: "Code verified"
    });
  } catch (error) {
    error.statusCode = error.statusCode || 400;
    next(error);
  }
}

async function resetUserPassword(req, res, next) {
  try {
    const { email, code, newPassword } = req.body;

    await authService.resetPassword(email, code, newPassword);

    return sendResponse(res, 200, {
      message: "Password updated successfully"
    });
  } catch (error) {
    error.statusCode = error.statusCode || 400;
    next(error);
  }
}

module.exports = {
  register,
  login,
  logout,
  googleLogin,
  googleLocalStorageBasedLogin,
  forgetPassword,
  resetUserPassword,
  verifyCode,
  verifyEmail,
  verifyEmailOtp,
  linkedinLogin
};
