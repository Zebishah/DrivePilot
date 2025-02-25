import type React from "react";
import { Outlet } from "react-router-dom";
import OnboardingLayout from "../layouts/OnboardingLayout";
import { TempPrivateRoute } from "../components/PrivateRoute";


const OnboardingRoutes: React.FC = () => {
    return (
        <OnboardingLayout>
            <TempPrivateRoute >
                <Outlet />
            </TempPrivateRoute>

        </OnboardingLayout>
    );
};

export default OnboardingRoutes;