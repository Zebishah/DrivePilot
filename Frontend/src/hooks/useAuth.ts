import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../store/slices/authSlice";
import type { RootState } from "../store";

export const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token, isLoading, error } = useSelector(
    (state: RootState) => state.auth
  );

  const login = async (credentials: { email: string; password: string }) => {
    try {
      // Implement your login logic here
      // const response = await authApi.login(credentials);
      // dispatch(setCredentials(response.data));
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    name: string;
  }) => {
    try {
      // Implement your registration logic here
      // const response = await authApi.register(userData);
      // dispatch(setCredentials(response.data));
    } catch (error) {
      console.error("Registration failed:", error);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return {
    user,
    token,
    isLoading,
    error,
    login,
    register,
    logout: handleLogout,
  };
};

export default useAuth;
