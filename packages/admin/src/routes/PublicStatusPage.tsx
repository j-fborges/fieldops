import { useParams } from 'react-router-dom';

export default function PublicStatusPage() {
  const { token } = useParams<{ token: string }>();

  return (
    <main className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Status da Visita
        </h1>
        <p className="text-gray-600">
          Token: <code className="bg-gray-100 px-2 py-1 rounded">{token}</code>
        </p>
      </div>
    </main>
  );
}
