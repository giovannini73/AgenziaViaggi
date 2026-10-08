import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Accedi } from './pages/Accedi'
import { CreateWithAi } from './pages/CreateWithAi'
import { EditItinerary } from './pages/EditItinerary'
import { Home } from './pages/Home'
import { Itinerary } from './pages/Itinerary'
import { NewItinerary } from './pages/NewItinerary'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/accedi" element={<Accedi />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/nuovo" element={<NewItinerary />} />
          <Route path="/crea-con-ai" element={<CreateWithAi />} />
          <Route path="/itinerario/:id" element={<Itinerary />} />
          <Route path="/itinerario/:id/modifica" element={<EditItinerary />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
