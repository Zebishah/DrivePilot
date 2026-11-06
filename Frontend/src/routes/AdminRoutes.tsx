import type React from "react";
import { Outlet } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import { AdminPrivateRoute } from "../components/PrivateRoute";

const AdminRoutes: React.FC = () => {
    return (
        <AdminLayout>
            <AdminPrivateRoute >
                <Outlet />
            </AdminPrivateRoute>
        </AdminLayout>
    );
};

export default AdminRoutes;