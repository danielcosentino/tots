import React, { useState } from "react";
import logo from "../Images/ucf-logo.png";
import { Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.css";

function VerifyForgotPasswordUser() {
  var verificationCode;
  var validationVerificationCode;

  const [message, setMessage] = useState("");

  function validateVerificationCode() {
    if (verificationCode.value === "") {
      setMessage("Please enter a verification code.");
      return false;
    }

    if (verificationCode.value.length !== 4) {
      setMessage("Verfication Code must be 4 characters long.");
      return false;
    }

    return true;
  }

  const doVerify = async (event) => {
    event.preventDefault();

    validationVerificationCode = validateVerificationCode();
    if (!validationVerificationCode) {
      return;
    }
    window.location.href = "/resetPassword";
  };

  return (
    <div id="verifyForgotPasswordUserDiv">
      <nav
        className="navbar container-fluid"
        style={{ backgroundColor: "#FFC904" }}
      >
        <Link to="/forgotPassword">Back</Link>
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
        <h1 id="inner-title">Verify User</h1>
        <form onSubmit={doVerify}>
          <label
            htmlFor="verificationCode"
            style={{
              fontSize: 24,
            }}
          >
            Enter the 4 digit code you received in your email
          </label>
          <br />
          <input
            type="password"
            id="verificationCode"
            className="border-4 w-50 p-3"
            style={{
              borderColor: "#FFC904",
              borderRadius: 25,
            }}
            placeholder="Verification Code"
            ref={(c) => (verificationCode = c)}
          />
          <br />
          <span id="verifyForgotPasswordResult" className="text-danger">
            {message}
          </span>
          <br />
          <button
            id="verifyUserButton"
            type="submit"
            className="p-3 w-25 m-3"
            style={{
              borderRadius: 25,
              backgroundColor: "#FFC904",
              fontSize: 24,
            }}
            onClick={doVerify}
          >
            Verify
          </button>
        </form>
      </div>
    </div>
  );
}

export default VerifyForgotPasswordUser;
