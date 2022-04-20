import React, { useState } from "react";
import logo from "../Images/ucf-logo.png";
import lock from "../Images/lock.png";
import { Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.css";
import validator from "validator";

function ForgotPassword() {
  var email;
  var validationEmail;

  const [message, setMessage] = useState("");

  function validateEmail() {
    if (!email.value) {
      setMessage("Please enter an email.");
      return false;
    }

    if (!validator.isEmail(email.value)) {
      setMessage("Email is not valid!");
      return false;
    }
    return true;
  }

  const doConfirmEmail = async (event) => {
    event.preventDefault();

    validationEmail = validateEmail();

    if (!validationEmail) {
      return;
    }
    window.location.href = "/verifyForgotPasswordUser";
  };

  return (
    <div id="forgotPasswordDiv">
      <nav
        className="navbar container-fluid"
        style={{ backgroundColor: "#FFC904" }}
      >
        <Link to="/login">Back</Link>
      </nav>
      <div id="contentDiv" className="container-fluid text-center p-4">
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
        <div id="lockDiv">
          <img
            src={lock}
            alt="lock"
            style={{
              borderRadius: 25,
              width: "8%",
            }}
          />
        </div>
        <h1 id="inner-title">Forgot Password?</h1>
        <form onSubmit={doConfirmEmail}>
          <label
            htmlFor="email"
            style={{
              fontSize: 24,
            }}
          >
            Email
          </label>
          <br />
          <input
            type="text"
            id="email"
            className="border-4 w-50 p-3"
            style={{
              borderColor: "#FFC904",
              borderRadius: 25,
            }}
            placeholder="Email"
            ref={(c) => (email = c)}
          />
          <br />
          <span id="forgotPasswordResult">{message}</span>
          <br />
          <button
            id="sendVerificationButton"
            type="submit"
            className="p-3 w-25 m-3"
            style={{
              borderRadius: 25,
              backgroundColor: "#FFC904",
              fontSize: 24,
            }}
            onClick={doConfirmEmail}
          >
            Send Verification Code
          </button>
        </form>
      </div>
    </div>
  );
}

export default ForgotPassword;
