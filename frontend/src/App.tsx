
import { Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "./layouts/MainLayout";

import HomePage from "./pages/Homepage";
import CatalogPage from "./pages/Cataloge";
import RentalDetailPage from "./pages/RentalDetailPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";

import BookingPage from "./pages/BookingPage";
import MyBookingPage from "./pages/MyBookingPage";
import MyRentalsPage from "./pages/MyRentalsPage";
import FavoritesPage from "./pages/FavouritesPage";
import NotificationsPage from "./pages/NotificationsPage";
import BlacklistPage from "./pages/BlackListPage";
import CreateRentalPage from "./pages/CreateRentalPage";

import { useAuth } from "./context/AuthContext";

function App() {
    const { isAuthenticated, user } = useAuth();

    const role = String(user?.role ?? "")
        .trim()
        .toUpperCase();

    const isRenter = role === "RENTER";

    const isLessor =
        role === "LESSOR" || role === "LESSER";

    return (
        <div className="app">
            <Routes>
                <Route element={<MainLayout />}>

                    <Route
                        path="/"
                        element={<HomePage />}
                    />

                    <Route
                        path="/rentals"
                        element={<CatalogPage />}
                    />

                    <Route
                        path="/rentals/:rentalId"
                        element={<RentalDetailPage />}
                    />

                    <Route
                        path="/login"
                        element={<LoginPage />}
                    />

                    <Route
                        path="/register"
                        element={<RegisterPage />}
                    />

                    <Route
                        path="/profile"
                        element={
                            isAuthenticated
                                ? <ProfilePage />
                                : <Navigate to="/login" replace />
                        }
                    />

                    <Route
                        path="/favorites"
                        element={
                            isAuthenticated
                                ? <FavoritesPage />
                                : <Navigate to="/login" replace />
                        }
                    />

                    <Route
                        path="/notifications"
                        element={
                            isAuthenticated
                                ? <NotificationsPage />
                                : <Navigate to="/login" replace />
                        }
                    />

                    <Route
                        path="/rentals/:rentalId/booking"
                        element={
                            isAuthenticated && isRenter
                                ? <BookingPage />
                                : (
                                    <Navigate
                                        to={isAuthenticated ? "/" : "/login"}
                                        replace
                                    />
                                )
                        }
                    />

                    <Route
                        path="/bookings"
                        element={
                            isAuthenticated && (isRenter || isLessor)
                                ? <MyBookingPage />
                                : (
                                    <Navigate
                                        to={isAuthenticated ? "/" : "/login"}
                                        replace
                                    />
                                )
                        }
                    />

                    <Route
                        path="/my-rentals"
                        element={
                            isAuthenticated && isLessor
                                ? <MyRentalsPage />
                                : (
                                    <Navigate
                                        to={isAuthenticated ? "/" : "/login"}
                                        replace
                                    />
                                )
                        }
                    />

                    <Route
                        path="/blacklist"
                        element={
                            isAuthenticated && isLessor
                                ? <BlacklistPage />
                                : (
                                    <Navigate
                                        to={isAuthenticated ? "/" : "/login"}
                                        replace
                                    />
                                )
                        }
                    />

                    <Route
                      path="/my-rentals/create"
                      element={
                        isAuthenticated && isLessor
                          ? <CreateRentalPage />
                          : (
                            <Navigate
                              to={isAuthenticated ? "/" : "/login"}
                              replace
                            />
                          )
                      }
                    />

                    <Route
                        path="*"
                        element={<Navigate to="/" replace />}
                    />

                </Route>
            </Routes>
        </div>
    );
}

export default App;
