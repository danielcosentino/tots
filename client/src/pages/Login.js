import React, { useState } from "react";
import jwt from "jwt-decode";
import { Link } from "react-router-dom";
import logo from "../Images/ucf-logo.png";
import "bootstrap/dist/css/bootstrap.css";
import validator from "validator";

function Login() {
  var loginEmail;
  var loginPassword;

  var validationEmail;
  var validationPassword;

  const [emailMessage, setEmailMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [message, setMessage] = useState("");

  function validateEmail() {
    if (!loginEmail.value) {
      setEmailMessage("Please enter an email.");
      return false;
    }

    if (!validator.isEmail(loginEmail.value)) {
      setEmailMessage("Email is not valid!");
      return false;
    }
    return true;
  }

  function validatePassword() {
    if (!loginPassword.value) {
      setPasswordMessage("Please enter a password.");
      return false;
    }

    if (loginPassword.value.length < 6) {
      setPasswordMessage("Password should be 6 characters long.");
      return false;
    }
    return true;
  }

  const doLogin = async (event) => {
    event.preventDefault();

    setEmailMessage("");
    setPasswordMessage("");
    setMessage("");

    validationEmail = validateEmail();
    validationPassword = validatePassword();

    if (!validationEmail || !validationPassword) {
      return;
    }

    var obj = { email: loginEmail.value, password: loginPassword.value };
    var js = JSON.stringify(obj);

    console.log(js);

    try {
      const response = await fetch(
        "https://group1-tots-mern.herokuapp.com/api/login",
        {
          method: "POST",
          body: js,
          headers: { "Content-Type": "application/json" },
        }
      );

      var resp = JSON.parse(await response.text());

      console.log(resp);

      var data = jwt(resp.data);

      console.log(data);

      if (data.error) {
        setMessage(data.error);
        if (data.error === "User not verified") {
          window.location.href = "/verifyRegisterUser";
        }
      } else {
        var user = {
          id: data.id,
        };
        localStorage.setItem("user_data", JSON.stringify(user));
        setMessage("You have logged in.");
      }
    } catch (e) {
      console.log(e.toString());
      return;
    }
  };

  return (
    <div id="loginDiv" className="container-fluid text-center pt-2">
      <div id="logoDiv">
        <img
          src={logo}
          alt="ucf-logo"
          style={{
            borderRadius: 25,
            width: "10%",
          }}
        />
      </div>
      <h1
        id="totsHeader"
        style={{
          color: "#FFC904",
        }}
      >
        TOP OF THE SCHEDULE
      </h1>
      <h1 id="inner-title">Login</h1>
      <form onSubmit={doLogin}>
        <label
          htmlFor="loginEmail"
          style={{
            fontSize: 24,
          }}
        >
          Email
        </label>
        <br />
        <input
          type="text"
          id="loginEmail"
          className="border-4 w-50 p-3"
          style={{
            borderColor: "#FFC904",
            borderRadius: 25,
          }}
          placeholder="Email"
          ref={(c) => (loginEmail = c)}
        />
        <br />
        <span id="emailMessageSpan" className="text-danger">
          {emailMessage}
        </span>
        <br />
        <label
          htmlFor="loginPassword"
          style={{
            fontSize: 24,
          }}
        >
          Password
        </label>
        <br />
        <input
          type="password"
          id="loginPassword"
          placeholder="Password"
          className="border-4 w-50 p-3"
          style={{
            borderColor: "#FFC904",
            borderRadius: 25,
          }}
          ref={(c) => (loginPassword = c)}
        />
        <br />
        <span id="passwordMessageSpan" className="text-danger">
          {passwordMessage}
        </span>
        <br />
        <div
          style={{
            fontSize: 24,
            textDecoration: "underline",
          }}
        >
          <Link to="/forgotPassword">Forgot Password?</Link>
        </div>
        <button
          id="loginButton"
          type="submit"
          className="p-3 w-25 m-3"
          style={{
            borderRadius: 25,
            backgroundColor: "#FFC904",
            fontSize: 24,
          }}
          onClick={doLogin}
        >
          Login
        </button>
        <div
          id="redirectRegister"
          style={{
            fontSize: 24,
          }}
        >
          Don't have an acccount?
          <span id="Register" style={{ textDecoration: "underline" }}>
            <Link to="/register">Register</Link>
          </span>
        </div>
      </form>
      <span id="loginResult">{message}</span>
    </div>
  );
}

export default Login;
