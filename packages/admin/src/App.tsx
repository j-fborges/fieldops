import { Route,Routes } from 'react-router-dom';

import PublicStatusPage from './routes/PublicStatusPage';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/v/:token" element={<PublicStatusPage />} />
        <Route
          path="/"
          element={
            <main className="flex items-center justify-center min-h-screen">
              <h1 className="text-2xl font-bold text-gray-800">FieldOps Admin</h1>
            </main>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
