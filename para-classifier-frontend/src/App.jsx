import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import HomePage from './components/HomePage'
import AnalysisPage from './components/AnalysisPage'
import ResultsPage from './components/ResultsPage'
import MigrationPage from './components/MigrationPage'

function App() {
  const [analysisData, setAnalysisData] = useState(null)
  const [classificationResults, setClassificationResults] = useState([])

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Routes>
          <Route 
            path="/" 
            element={
              <HomePage 
                setAnalysisData={setAnalysisData}
              />
            } 
          />
          <Route 
            path="/analysis" 
            element={
              <AnalysisPage 
                analysisData={analysisData}
                setAnalysisResults={setClassificationResults}
              />
            } 
          />
          <Route 
            path="/results" 
            element={
              <ResultsPage 
                results={classificationResults}
                onMigrate={setClassificationResults}
              />
            } 
          />
          <Route 
            path="/migration" 
            element={
              <MigrationPage 
                classifications={classificationResults}
              />
            } 
          />
        </Routes>
      </div>
    </Router>
  )
}

export default App

