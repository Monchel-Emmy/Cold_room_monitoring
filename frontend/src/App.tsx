import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Monitoring from './pages/Monitoring';
import Hospitals from './pages/Hospitals';
import ColdRooms from './pages/ColdRooms';
import ColdRoomDetail from './pages/ColdRoomDetail';
import Vaccines from './pages/Vaccines';
import Alerts from './pages/Alerts';
import Users from './pages/Users';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/"               element={<Dashboard />} />
            <Route path="/monitoring"     element={<Monitoring />} />
            <Route path="/hospitals"      element={<Hospitals />} />
            <Route path="/cold-rooms"     element={<ColdRooms />} />
            <Route path="/cold-rooms/:id" element={<ColdRoomDetail />} />
            <Route path="/vaccines"       element={<Vaccines />} />
            <Route path="/alerts"         element={<Alerts />} />
            <Route path="/users"          element={<Users />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
