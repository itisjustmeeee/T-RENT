import { useParams } from "react-router-dom";

export default function RentalDetailPage() {
    const { rentalId } = useParams<{ rentalId: string }>();

    return (
        <section className="page">
            <h1>Лофт, аренда</h1>

            <p>
                ID объявления: {rentalId}
            </p>
        </section>
    );
}