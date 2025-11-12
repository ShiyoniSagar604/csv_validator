import React, { useState, useRef, type KeyboardEvent, type DragEvent } from 'react'
import { validateAndCleanCSV, arrayToCSV } from './utils/csvParser'
import './index.css'

function App() {
  const [columns, setColumns] = useState<string[]>([])
  const [columnInput, setColumnInput] = useState('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvText, setCsvText] = useState<string>('')
  const [processedCSV, setProcessedCSV] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [, setInvalidCount] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAddColumn = () => {
    const trimmed = columnInput.trim()
    if (trimmed && !columns.includes(trimmed)) {
      setColumns([...columns, trimmed])
      setColumnInput('')
      setError('')
    }
  }

  const handleRemoveColumn = (index: number) => {
    setColumns(columns.filter((_col: string, i: number) => i !== index))
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddColumn()
    }
  }

  const handleFileSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file only.')
      return
    }

    setCsvFile(file)
    setError('')
    setSuccess('')
    setProcessedCSV('')
    setInvalidCount(0)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setCsvText(text)
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.classList.add('dragover')
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.classList.remove('dragover')
  }

  const handleProcessCSV = async () => {
    if (columns.length === 0) {
      setError('Please add at least one column name.')
      return
    }

    if (!csvFile || !csvText) {
      setError('Please upload a CSV file first.')
      return
    }

    setIsProcessing(true)
    setError('')
    setSuccess('')

    try {
      const { validRows, invalidRowCount } = validateAndCleanCSV(csvText, columns)
      const cleanedCSV = arrayToCSV(validRows)
      
      setProcessedCSV(cleanedCSV)
      setInvalidCount(invalidRowCount)
      
      if (invalidRowCount > 0) {
        setSuccess(`CSV processed successfully! Removed ${invalidRowCount} invalid ${invalidRowCount === 1 ? 'row' : 'rows'}.`)
      } else {
        setSuccess('CSV processed successfully! No invalid rows found.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing the CSV.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!processedCSV) return

    const blob = new Blob([processedCSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = csvFile ? `cleaned_${csvFile.name}` : 'cleaned_csv.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="app-container">
      <div className="header">
        <div className="header-icon">📄⬆️</div>
        <h1>CSV Email Validator</h1>
        <p>Remove invalid emails from your CSV files automatically</p>
      </div>

      <div className="card">
        <h2>Columns in Your CSV</h2>
        <p>Add the column names that exist in your CSV file</p>
        <div className="input-group">
          <input
            type="text"
            placeholder="Enter column name"
            value={columnInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setColumnInput(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button className="add-button" onClick={handleAddColumn}>
            <span>+</span>
            <span>Add</span>
          </button>
        </div>
        {columns.length > 0 ? (
          <div className="columns-list">
            {columns.map((col: string, index: number) => (
              <div key={index} className="column-tag">
                <span>{col}</span>
                <button onClick={() => handleRemoveColumn(index)}>×</button>
              </div>
            ))}
          </div>
        ) : (
          <p className="status-text">No columns added yet</p>
        )}
      </div>

      <div className="card">
        <h2>Upload CSV File</h2>
        <div
          className="upload-area"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="upload-icon">☁️⬆️</div>
          <p>Click to upload or drag and drop</p>
          <p className="file-type">CSV files only</p>
          {csvFile && <div className="file-name">{csvFile.name}</div>}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0]
            if (file) {
              handleFileSelect(file)
            }
          }}
        />
        <button
          className="process-button"
          onClick={handleProcessCSV}
          disabled={isProcessing || columns.length === 0 || !csvFile}
        >
          <span>📄⬆️</span>
          <span>{isProcessing ? 'Processing...' : 'Process CSV'}</span>
        </button>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        {processedCSV && (
          <button className="download-button" onClick={handleDownload}>
            <span>⬇️</span>
            <span>Download Cleaned CSV</span>
          </button>
        )}
      </div>

      <div className="footer">
        Made in Bolt
      </div>
    </div>
  )
}

export default App

