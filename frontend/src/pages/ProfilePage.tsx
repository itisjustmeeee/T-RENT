import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getMe, updateMe, deleteMe } from "../api/user.api";
import type { UserPublic, UserUpdate } from "../types/user.types";
import { useAuth } from "../context/AuthContext";

function ProfilePage() {
  const navigate = useNavigate();
  const { logout, updateUser } = useAuth();

  const [profile, setProfile] = useState<UserPublic | null>(null);

  const [form, setForm] = useState<UserUpdate>({
    name: "",
    surname: "",
    email: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const data = await getMe();

        if (!isMounted) return;

        setProfile(data);
        setForm({
          name: data.name,
          surname: data.surname,
          email: data.email,
        });
      } catch {
        if (isMounted) {
          setError("Не удалось загрузить профиль");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleEdit = () => {
    if (!profile) return;

    setForm({
      name: profile.name,
      surname: profile.surname,
      email: profile.email,
    });

    setError("");
    setIsEditing(true);
  };

  const handleChange = (field: keyof UserUpdate, value: string) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

    const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");

        const payload: UserUpdate = {
            name: form.name?.trim(),
            surname: form.surname?.trim(),
            email: form.email?.trim(),
        };

        try {
            setIsSaving(true);

            const updatedUser = await updateMe(payload);

            setProfile(updatedUser);

            updateUser(updatedUser);

            setForm({
                name: updatedUser.name,
                surname: updatedUser.surname,
                email: updatedUser.email,
            });

            setIsEditing(false);

        } catch {
            setError("Не удалось сохранить изменения. Проверь введённые данные.");
        } finally {
            setIsSaving(false);
        }
    };

  const handleCancel = () => {
    if (!profile) return;

    setForm({
      name: profile.name,
      surname: profile.surname,
      email: profile.email,
    });

    setError("");
    setIsEditing(false);
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Ты действительно хочешь удалить аккаунт? Это действие нельзя отменить."
    );

    if (!confirmed) return;

    try {
      setIsDeleting(true);
      await deleteMe();

      await logout();

      navigate("/", { replace: true });
    } catch {
      setError("Не удалось удалить аккаунт. Попробуй ещё раз.");
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <div className="container">Загрузка профиля...</div>;
  }

  if (!profile) {
    return (
      <div className="container">
        <p>{error || "Не удалось получить данные пользователя"}</p>
        <button onClick={() => navigate("/login")}>
          Войти
        </button>
      </div>
    );
  }

  return (
    <main className="profile-page container">
      <section className="profile-card">
        <div className="profile-avatar">
          {profile.name?.charAt(0).toUpperCase()}
        </div>

        <h1 className="profile-title">Мой профиль</h1>

        <p className="profile-role">
          {profile.role === "RENTER"
            ? "Арендатор"
            : profile.role}
        </p>

        {error && <div className="profile-error">{error}</div>}

        {isEditing ? (
          <form className="profile-form" onSubmit={handleSave}>
            <label>
              Имя
              <input
                type="text"
                value={form.name ?? ""}
                onChange={(e) => handleChange("name", e.target.value)}
                required
              />
            </label>

            <label>
              Фамилия
              <input
                type="text"
                value={form.surname ?? ""}
                onChange={(e) => handleChange("surname", e.target.value)}
                required
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => handleChange("email", e.target.value)}
                required
              />
            </label>

            <div className="profile-actions">
              <button
                type="submit"
                className="profile-button"
                disabled={isSaving}
              >
                {isSaving ? "Сохранение..." : "Сохранить"}
              </button>

              <button
                type="button"
                className="profile-button profile-button--secondary"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Отмена
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="profile-info">
              <div className="profile-info-row">
                <span>Имя</span>
                <strong>{profile.name}</strong>
              </div>

              <div className="profile-info-row">
                <span>Фамилия</span>
                <strong>{profile.surname}</strong>
              </div>

              <div className="profile-info-row">
                <span>Email</span>
                <strong>{profile.email}</strong>
              </div>
            </div>

            <div className="profile-actions">
              <button
                type="button"
                className="profile-button"
                onClick={handleEdit}
              >
                Редактировать профиль
              </button>

              <button
                type="button"
                className="profile-button profile-button--danger"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Удаление..." : "Удалить аккаунт"}
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default ProfilePage;