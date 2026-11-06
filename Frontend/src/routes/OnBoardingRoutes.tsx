import type React from "react";
import { Outlet } from "react-router-dom";
import OnboardingLayout from "../layouts/OnboardingLayout";
import { OnboardingPrivateRoute } from "../components/PrivateRoute";


const OnboardingRoutes: React.FC = () => {
    return (
        <OnboardingLayout>
            <OnboardingPrivateRoute>
                <Outlet />
            </OnboardingPrivateRoute>
        </OnboardingLayout>
    );
};

export default OnboardingRoutes;
