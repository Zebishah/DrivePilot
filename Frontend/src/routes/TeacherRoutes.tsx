import type React from "react";
import { Outlet } from "react-router-dom";
import { TeacherPrivateRoute } from "../components/PrivateRoute";
import TeacherLayout from "../layouts/TeacherLayout";

const TeacherRoutes: React.FC = () => {
    return (
        <TeacherLayout>
            <TeacherPrivateRoute>
                <Outlet />
            </TeacherPrivateRoute>
        </TeacherLayout>
    );
};

export default TeacherRoutes;