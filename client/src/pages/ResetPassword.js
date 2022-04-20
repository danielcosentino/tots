import React, { useState } from "react";
import logo from "../Images/ucf-logo.png";
import { Link, useHistory } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.css";

function ResetPassword() {
  var newPassword;
  var confirmNewPassword;
  var validationNewPassword;
  var validationConfirmNewPassword;

  const [newPasswordMessage, setNewPasswordMessage] = useState("");
  const [confirmNewPasswordMessage, setConfirmNewPasswordMessage] =
    useState("");
  const [message, setMessage] = useState("");

  let history = useHistory();

  function validateNewPassword() {
    if (newPassword.value === "") {
      setNewPasswordMessage("Please enter a new password.");
      return false;
    }

    if (newPassword.value.length < 6) {
      setNewPasswordMessage("Password must be 6 characters long.");
      return false;
    }
    return true;
  }

  function validateConfirmNewPassword() {
    if (confirmNewPassword.value === "") {
      setConfirmNewPasswordMessage("Please enter a new password.");
      return false;
    }

    if (confirmNewPassword.value.length < 6) {
      setConfirmNewPasswordMessage("Password must be 6 characters long.");
      return false;
    }

    if (newPassword.value !== confirmNewPassword.value) {
      setConfirmNewPasswordMessage("Passwords should match.");
      return false;
    }

    return true;
  }

  const doReset = async (event) => {
    event.preventDefault();

    setMessage("");
    setNewPasswordMessage("");
    setConfirmNewPasswordMessage("");

    validationNewPassword = validateNewPassword();
    validationConfirmNewPassword = validateConfirmNewPassword();

    if (!validationNewPassword || !validationConfirmNewPassword) {
      return;
    }

    window.location.href = "/";
  };

  return (
    <div id="resetPasswordDiv">
      <nav
        className="navbar container-fluid"
        style={{ backgroundColor: "#FFC904" }}
      >
        <Link onClick={() => history.goBack()}>Back</Link>
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
        <label
          htmlFor="resetNewPassword"
          style={{
            fontSize: 24,
          }}
        >
          New Password
        </label>
        <br />
        <form onSubmit={doReset}>
          <input
            type="password"
            id="resetNewPassword"
            className="border-4 w-50 p-3"
            style={{
              borderColor: "#FFC904",
              borderRadius: 25,
            }}
            placeholder="Password"
            ref={(c) => (newPassword = c)}
          />
          <br />
          <span id="passwordMessageSpan" className="text-danger">
            {newPasswordMessage}
          </span>
          <br />
          <label
            htmlFor="resetConfirmPassword"
            style={{
              fontSize: 24,
            }}
          >
            Confirm New Password
          </label>
          <br />
          <input
            type="password"
            id="resetConfirmPassword"
            className="border-4 w-50 p-3"
            style={{
              borderColor: "#FFC904",
              borderRadius: 25,
            }}
            placeholder="Confirm Password"
            ref={(c) => (confirmNewPassword = c)}
          />
          <br />
          <span id="confirmPasswordMessageSpan" className="text-danger">
            {confirmNewPasswordMessage}
          </span>
          <br />
          <button
            id="resetButton"
            type="submit"
            className="p-3 w-25 m-3"
            style={{
              borderRadius: 25,
              backgroundColor: "#FFC904",
              fontSize: 24,
            }}
            onClick={doReset}
          >
            Reset Password
          </button>
        </form>
        <span id="resetPasswordResult">{message}</span>
      </div>
    </div>
  );
}

export default ResetPassword;
