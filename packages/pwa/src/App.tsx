import { Route, Routes } from 'react-router-dom';

import Dashboard from './routes/Dashboard';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route
          path="/"
          element={
            <main className="flex items-center justify-center min-h-screen">
              <Dashboard />
            </main>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
