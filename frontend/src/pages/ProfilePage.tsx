import { useAuth } from "../context/AuthContext";

function ProfilePage() {
    const { user } = useAuth();

    if (!user) {
        return null;
    }

    return (
        <main className="container page">
            <h1>Мой профиль</h1>

            <p>Имя: {user.name}</p>
            <p>Фамилия: {user.surname || "Не указана"}</p>
            <p>Email: {user.email}</p>
            <p>
                Тип аккаунта: {
                    user.role === "RENTER"
                        ? "Арендатор"
                        : "Арендодатель"
                }
            </p>
        </main>
    );
}

export default ProfilePage;