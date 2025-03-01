import React, { useState, useEffect } from 'react';
import './App.css';

const getTodayString = () => {
  return new Date().toISOString().split('T')[0];
};

// Update the formatDate function to use ISO format
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];  // Returns YYYY-MM-DD format
};

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [medications, setMedications] = useState([]);
  const [startDates, setStartDates] = useState({});
  const [frequencies, setFrequencies] = useState({});
  const [medicationTimes, setMedicationTimes] = useState({});
  const [confirmation, setConfirmation] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (medications.length > 0) {
      const initialDates = {};
      const initialFrequencies = {};
      medications.forEach((_, index) => {
        initialDates[index] = getTodayString();
        initialFrequencies[index] = 'everyday'; // Set default frequency
      });
      setStartDates(initialDates);
      setFrequencies(initialFrequencies);
    }
  }, [medications]);

  const handleFileSelect = (event) => {
    setSelectedFile(event.target.files[0]);
    setUploadStatus('');
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus('Please select a file first');
      return;
    }

    setIsUploading(true);
    try {
      // Upload the file to the API Gateway endpoint
      const uploadResponse = await fetch('https://2fa7b2jpo3.execute-api.ap-south-1.amazonaws.com/upload', {
        method: 'POST',
        body: selectedFile,
        mode: 'cors',
        headers: {
          'Content-Type': 'image/png'
        }
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text().catch(() => 'Unknown error');
        throw new Error(`Upload failed: ${errorText}`);
      }

      const data = await uploadResponse.json();
      console.log('API Response:', data);  // Debug log

      setUploadStatus('File uploaded successfully!');
      setMedications(data.medications.medications);
      setSelectedFile(null);
      // Reset the file input
      document.getElementById('fileInput').value = '';
    } catch (error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      setUploadStatus(`Error uploading file: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDateChange = (index, dateString) => {
    setStartDates(prevDates => ({
      ...prevDates,
      [index]: dateString
    }));
  };

  const handleFrequencyChange = (index, value) => {
    setFrequencies(prev => ({
      ...prev,
      [index]: value
    }));
  };

  const handleTimeChange = (index, time) => {
    setMedicationTimes(prev => ({
      ...prev,
      [index]: time
    }));
  };

  const handleConfirmation = () => {
    setConfirmation(prev => !prev);
  };

  // Update calculateEndDate function
  const calculateEndDate = (startDate, numberOfDays, frequency) => {
    if (!startDate || !numberOfDays) return '';
    
    const date = new Date(startDate);
    const adjustedDays = frequency === 'alternate' 
      ? (numberOfDays * 2) - 1
      : numberOfDays - 1;
      
    date.setDate(date.getDate() + adjustedDays);
    return formatDate(date);  // Will now return in YYYY-MM-DD format
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Phone number validation
    if (!phoneNumber) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+91[0-9]{10}$/.test(phoneNumber)) {
      newErrors.phone = 'Please enter a valid phone number in format +91XXXXXXXXXX';
    }

    // Validate each medication
    medications.forEach((med, index) => {
      if (!frequencies[index]) {
        newErrors[`frequency_${index}`] = 'Please select a frequency';
      }
      if (!startDates[index]) {
        newErrors[`startDate_${index}`] = 'Please select a start date';
      }
      if (!medicationTimes[index]) {
        newErrors[`time_${index}`] = 'Please select a time';
      }
    });

    // Validate confirmation
    if (!confirmation) {
      newErrors.confirmation = 'Please confirm your medication settings';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      const medicationDetails = medications.map((med, index) => ({
        ...med,
        frequency: frequencies[index],
        startDate: startDates[index],
        endDate: calculateEndDate(startDates[index], med.number_of_days, frequencies[index]),
        time: medicationTimes[index],
      }));

      const submissionData = {
        phoneNumber,
        medications: medicationDetails,
        confirmed: confirmation
      };

      try {
        const response = await fetch('https://2fa7b2jpo3.execute-api.ap-south-1.amazonaws.com/set_reminder', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submissionData),
          mode: 'cors'
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to set reminder: ${errorText}`);
        }

        const result = await response.json();
        console.log('Reminder set successfully:', result);
        alert('Medication reminders have been set successfully!');
        
        // Reset form or redirect user as needed
        setMedications([]);
        setStartDates({});
        setFrequencies({});
        setMedicationTimes({});
        setConfirmation(false);
        setPhoneNumber('');
        setErrors({});
        
      } catch (error) {
        console.error('Error setting reminder:', error);
        alert('Failed to set medication reminders. Please try again.');
      }
    } else {
      alert('Please fix the errors before submitting');
    }
  };

  return (
    <div className="App">
      <div className="upload-container">
        {medications.length === 0 ? (
          <>
            <h1 className="main-title">REMEDI</h1>
            <h2 className="subtitle">Upload your prescription</h2>
            <div className="upload-box">
              <input
                type="file"
                id="fileInput"
                onChange={handleFileSelect}
                accept="image/*"
                disabled={isUploading}
              />
              <button 
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className={`upload-button ${(!selectedFile || isUploading) ? 'disabled' : ''}`}
              >
                {isUploading ? 'Uploading...' : 'Upload Image'}
              </button>
            </div>
            {uploadStatus && (
              <div className={`status-message ${uploadStatus.includes('Error') ? 'error' : 'success'}`}>
                {uploadStatus}
              </div>
            )}
          </>
        ) : (
          <div className="medications-list">
            <h2>Medications</h2>
            <div className="phone-input-container">
              <label htmlFor="phoneNumber">Phone Number:</label>
              <input
                type="text"
                id="phoneNumber"
                placeholder="+91XXXXXXXXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className={`phone-input ${errors.phone ? 'error' : ''}`}
              />
              {errors.phone && <span className="error-message">{errors.phone}</span>}
            </div>
            <div className="cards-container">
              {medications.map((med, index) => (
                <div key={index} className="card">
                  <div className="medication-details">
                    <h3 className="medicine-name">{med.medicine_name}</h3>
                    <div className="details-grid">
                      <div className="detail-item">
                        <span className="detail-label">Time of Day:</span>
                        <span className="detail-value">{med.time_of_day}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Duration:</span>
                        <span className="detail-value">{med.number_of_days} days</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Food Relationship:</span>
                        <span className="detail-value">{med.food_relationship}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Dosage:</span>
                        <span className="detail-value">{med.dosage}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="frequency-input">
                    <label htmlFor={`frequency-${index}`}>Frequency:</label>
                    <select
                      id={`frequency-${index}`}
                      value={frequencies[index]}
                      onChange={(e) => handleFrequencyChange(index, e.target.value)}
                      className="frequency-select"
                    >
                      <option value="everyday">Every day</option>
                      <option value="alternate">Alternate days</option>
                    </select>
                    {errors[`frequency_${index}`] && <p className="error-message">{errors[`frequency_${index}`]}</p>}
                  </div>

                  <div className="date-input">
                    <label htmlFor={`startDate-${index}`}>When do you want to start?</label>
                    <input
                      type="date"
                      id={`startDate-${index}`}
                      value={startDates[index] || getTodayString()}
                      onChange={(e) => handleDateChange(index, e.target.value)}
                      min={getTodayString()}
                    />
                    {/* Update the end date display in the JSX */}
                    {startDates[index] && (
                      <p className="end-date">
                        <strong>End Date:</strong>
                        <span>{calculateEndDate(startDates[index], med.number_of_days, frequencies[index])}</span>
                      </p>
                    )}
                    {errors[`startDate_${index}`] && <p className="error-message">{errors[`startDate_${index}`]}</p>}
                  </div>

                  <div className="time-input">
                    <label htmlFor={`time-${index}`}>What time?</label>
                    <input
                      type="time"
                      id={`time-${index}`}
                      value={medicationTimes[index] || ''}
                      onChange={(e) => handleTimeChange(index, e.target.value)}
                    />
                    {errors[`time_${index}`] && <p className="error-message">{errors[`time_${index}`]}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="confirmation-box">
              <label className="confirmation-label">
                <input
                  type="checkbox"
                  checked={confirmation}
                  onChange={handleConfirmation}
                  className="confirmation-checkbox"
                />
                <span>I have reviewed and confirmed these are the settings for all my medication reminders</span>
              </label>
              {errors.confirmation && <span className="error-message">{errors.confirmation}</span>}
            </div>
            <button 
              onClick={handleSubmit}
              className="submit-button"
              disabled={!confirmation}
            >
              Submit Medication Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
