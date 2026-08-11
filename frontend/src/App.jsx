import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard'; // Tu componente actual con la tabla
import ApHistoryView from './components/ApHistoryView';   // El nuevo componente que crearemos para el histórico

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta principal donde está tu tabla de eventos actual */}
        <Route path="/" element={<Dashboard />} />
        
        {/* Ruta dinámica para el histórico del AP usando su IP o ID */}
        <Route path="/ap/:ip" element={<ApHistoryView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;