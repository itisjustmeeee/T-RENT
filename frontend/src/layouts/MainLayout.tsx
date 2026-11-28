
import { Outlet } from "react-router-dom";

import Header from "../components/layout/Header";

function MainLayout() {
    return (
        <>
            <Header />

            <main className="app-main">
                <Outlet />
            </main>

            <footer className="site-footer">
                <div className="container footer__inner">
                    <div>
                        <h3>T-RENT</h3>

                        <p>
                            © 2026 T-RENT · Помещения на час,
                            впечатления надолго
                        </p>
                    </div>

                    <div className="footer__links">
                        <span>Поддержка</span>
                        <span>Правила сервиса</span>
                        <span>Арендодателям</span>
                    </div>
                </div>
            </footer>
        </>
    );
}

export default MainLayout;
