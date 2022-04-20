import Login from "./pages/Login.js";
import Register from "./pages/Register.js";
import VerifyRegisterUser from "./pages/VerifyRegisterUser.js";
import VerifyForgotPasswordUser from "./pages/VerifyForgotPasswordUser.js";
import ResetPassword from "./pages/ResetPassword";
import ForgotPassword from "./pages/ForgotPassword.js";
import {
  BrowserRouter as Router,
  Route,
  Redirect,
  Switch,
} from "react-router-dom";
import "./App.css";

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/" exact>
          <Login />
        </Route>
        <Route path="/register" exact>
          <Register />
        </Route>
        <Route path="/verifyRegisterUser" exact>
          <VerifyRegisterUser />
        </Route>
        <Route path="/resetPassword" exact>
          <ResetPassword />
        </Route>
        <Route path="/verifyForgotPasswordUser" exact>
          <VerifyForgotPasswordUser />
        </Route>
        <Route path="/forgotPassword" exact>
          <ForgotPassword />
        </Route>
        <Redirect to="/" />
      </Switch>
    </Router>
  );
}

export default App;
