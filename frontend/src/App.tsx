import { Routes, Route } from "react-router-dom";

import MainLayout from "./layouts/MainLayout";

import HomePage from "./pages/Homepage";
import CatalogPage from "./pages/Cataloge";
import RentalDetailPage from "./pages/RentalDetailPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import { Navigate } from "react-router-dom";
import ProfilePage from "./pages/ProfilePage";
import { useAuth } from "./context/AuthContext";

import BookingPage from "./pages/BookingPage";
import MyBookingPage from "./pages/MyBookingPage";

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />}/>

        <Route path="/rentals" element={<CatalogPage />}/>

        <Route
          path="/rentals/:rentalId"
          element={<RentalDetailPage />}
        />

        <Route path="/login" element={<LoginPage />} />

        <Route path="/register" element={<RegisterPage />}/>

        <Route
          path="/profile"
          element={
            isAuthenticated
              ? <ProfilePage />
              : <Navigate to="/login" replace/>
          }
        />

        <Route
          path="/rentals/:rentalId/booking"
          element={<BookingPage />}
        />

        <Route
          path="/bookings"
          element={
            isAuthenticated
              ? <MyBookingPage />
              : <Navigate to="/login" replace/>
            }
        />

        <Route path="*" element={<Navigate to="/" replace />}/>
      </Route>
    </Routes>
  );
}

export default App;