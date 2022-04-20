import React, { useState } from "react";
import jwt from "jwt-decode";
import logo from "../Images/ucf-logo.png";
import { Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.css";
import validator from "validator";

function Register() {
  var registerEmail;
  var registerPassword;
  var registerConfirmPassword;

  var validationEmail;
  var validationPassword;
  var validationConfirmPassword;

  const [emailMessage, setEmailMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [confirmPasswordMessage, setConfirmPasswordMessage] = useState("");
  const [message, setMessage] = useState("");

  function validateEmail() {
    if (!registerEmail.value) {
      setEmailMessage("Please enter an email.");
      return false;
    }

    if (!validator.isEmail(registerEmail.value)) {
      setEmailMessage("Email is not valid!");
      return false;
    }
    return true;
  }

  function validatePassword() {
    if (!registerPassword.value) {
      setPasswordMessage("Please enter a password.");
      return false;
    }

    if (registerPassword.value.length < 6) {
      setPasswordMessage("Password should be 6 characters long.");
      return false;
    }
    return true;
  }

  function validateConfirmPassword() {
    if (!registerConfirmPassword.value) {
      setConfirmPasswordMessage("Please enter a password.");
      return false;
    }

    if (registerConfirmPassword.value.length < 6) {
      setConfirmPasswordMessage("Password should be 6 characters long.");
      return false;
    }

    if (registerPassword.value !== registerConfirmPassword.value) {
      setConfirmPasswordMessage("Passwords should match");
      return false;
    }
    return true;
  }

  const doRegister = async (event) => {
    event.preventDefault();

    setEmailMessage("");
    setMessage("");
    setPasswordMessage("");
    setConfirmPasswordMessage("");

    validationEmail = validateEmail();
    validationPassword = validatePassword();
    validationConfirmPassword = validateConfirmPassword();

    if (!validationEmail || !validationPassword || !validationConfirmPassword) {
      return;
    }

    var obj = {
      email: registerEmail.value,
      password: registerPassword.value,
    };
    var js = JSON.stringify(obj);

    console.log(js);

    try {
      const response = await fetch(
        "https://group1-tots-mern.herokuapp.com/api/register",
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
      } else {
        var user = {
          id: data.id,
        };
        localStorage.setItem("user", JSON.stringify(user));
        setMessage("");
        window.location.href = "/verifyRegisterUser";
      }
    } catch (e) {
      console.log(e.toString());
      return;
    }
  };

  return (
    <div id="registerDiv" className="container-fluid text-center pt-2">
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
      <h1 id="inner-title">Register</h1>
      <form onSubmit={doRegister}>
        <label
          htmlFor="registerEmail"
          style={{
            fontSize: 24,
          }}
        >
          Email
        </label>
        <br />
        <input
          type="text"
          id="registerEmail"
          className="border-4 w-50 p-3"
          style={{
            borderColor: "#FFC904",
            borderRadius: 25,
          }}
          placeholder="Email"
          ref={(c) => (registerEmail = c)}
        />
        <br />
        <span id="emailMessageSpan" className="text-danger">
          {emailMessage}
        </span>
        <br />
        <label
          htmlFor="registerPassword"
          style={{
            fontSize: 24,
          }}
        >
          Password
        </label>
        <br />
        <input
          type="password"
          id="registerPassword"
          className="border-4 w-50 p-3"
          style={{
            borderColor: "#FFC904",
            borderRadius: 25,
          }}
          placeholder="Password"
          ref={(c) => (registerPassword = c)}
        />
        <br />
        <span id="passwordMessageSpan" className="text-danger">
          {passwordMessage}
        </span>
        <br />
        <label
          htmlFor="registerConfirmPassword"
          style={{
            fontSize: 24,
          }}
        >
          Confirm Password
        </label>
        <br />
        <input
          type="password"
          id="registerConfirmPassword"
          className="border-4 w-50 p-3"
          style={{
            borderColor: "#FFC904",
            borderRadius: 25,
          }}
          placeholder="Confirm Password"
          ref={(c) => (registerConfirmPassword = c)}
        />
        <br />
        <span id="confirmPasswordMessageSpan" className="text-danger">
          {confirmPasswordMessage}
        </span>
        <br />
        <button
          id="registerButton"
          type="submit"
          className="p-3 w-25 m-3"
          style={{
            borderRadius: 25,
            backgroundColor: "#FFC904",
            fontSize: 24,
          }}
          onClick={doRegister}
        >
          Register
        </button>
        <div
          id="redirectLogin"
          style={{
            fontSize: 24,
          }}
        >
          Already have an acccount?
          <span id="Login" style={{ textDecoration: "underline" }}>
            <Link to="/">Login</Link>
          </span>
        </div>
      </form>
      <span id="registerResult">{message}</span>
    </div>
  );
}

export default Register;
