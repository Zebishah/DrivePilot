import type React from "react";
import { Outlet } from "react-router-dom";
import { StudentPrivateRoute } from "../components/PrivateRoute";
import StudentLayout from "../layouts/StudentLayout";


const StudentRoutes: React.FC = () => {
    return (
        <StudentLayout>
            <StudentPrivateRoute >
                <Outlet />
            </StudentPrivateRoute>
        </StudentLayout>
    );
};

export default StudentRoutes;