'use client'

import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, AlertTriangle, Truck, Ambulance, Ship, Wrench, Users, FileText, TrendingUp } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const WISARVehicleLog = () => {
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [newDriverName, setNewDriverName] = useState('');
  const [testLogs, setTestLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load data from database
  useEffect(() => {
    loadVehicles();
    loadDrivers();
    loadTestLogs();
  }, []);

  const loadVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('last_test', { ascending: true });
      
      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  };

  const loadDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setDrivers(data?.map(d => d.name) || []);
    } catch (error) {
      console.error('Error loading drivers:', error);
    }
  };

  const loadTestLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('test_logs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTestLogs(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading test logs:', error);
      setLoading(false);
    }
  };

  const addDriver = async () => {
    if (newDriverName.trim() && !drivers.includes(newDriverName.trim())) {
      try {
        const { error } = await supabase
          .from('drivers')
          .insert([{ name: newDriverName.trim() }]);
        
        if (error) throw error;
        
        setDrivers([...drivers, newDriverName.trim()]);
        setNewDriverName('');
      } catch (error) {
        console.error('Error adding driver:', error);
      }
    }
  };

  const addTestLog = async (vehicleId, testData, testType = 'drive') => {
    try {
      const { error } = await supabase
        .from('test_logs')
        .insert([{
          vehicle_id: vehicleId,
          tester: testData.tester,
          test_type: testType,
          test_date: new Date().toISOString().split('T')[0],
          notes: testData.notes,
          checklist_results: testData.checklist,
          pressure: testData.pressure,
          flow_rate: testData.flowRate,
          status: testData.checklist?.every(item => item.passed) ? 'pass' : 'fail'
        }]);

      if (error) throw error;

      // Update vehicle's last test date
      await supabase
        .from('vehicles')
        .update({ last_test: new Date().toISOString().split('T')[0] })
        .eq('id', vehicleId);

      // Reload data
      loadVehicles();
      loadTestLogs();
    } catch (error) {
      console.error('Error adding test log:', error);
    }
  };

  const getVehicleStatus = (vehicle) => {
    if (!vehicle) return { status: 'unknown', daysOverdue: 0 };
    
    const today = new Date();
    const lastTestDate = new Date(vehicle.last_test);
    const daysSinceTest = Math.floor((today - lastTestDate) / (1000 * 60 * 60 * 24));
    
    if (daysSinceTest <= 7) {
      return { status: 'operational', daysOverdue: 0 };
    } else {
      const daysOverdue = daysSinceTest - 7;
      return { status: 'needs-inspection', daysOverdue };
    }
  };

  const getSortedVehicles = () => {
    return [...vehicles].sort((a, b) => {
      const statusA = getVehicleStatus(a);
      const statusB = getVehicleStatus(b);
      
      if (statusA.status === 'needs-inspection' && statusB.status === 'needs-inspection') {
        return statusB.daysOverdue - statusA.daysOverdue;
      }
      
      if (statusA.status === 'needs-inspection' && statusB.status !== 'needs-inspection') {
        return -1;
      }
      if (statusB.status === 'needs-inspection' && statusA.status !== 'needs-inspection') {
        return 1;
      }
      
      return new Date(a.last_test) - new Date(b.last_test);
    });
  };

  const getVehicleIcon = (type) => {
    switch (type) {
      case 'fire': return Truck;
      case 'ambulance': return Ambulance;
      case 'marine': return Ship;
      default: return Truck;
    }
  };

  const testDriveChecklist = [
    'Engine starts properly',
    'Brakes function correctly',
    'Steering responsive',
    'Warning lights check',
    'Fluid levels adequate',
    'Tires in good condition',
    'Headlights operational'
  ];

  const pumpTestChecklist = [
    'Pump primes properly',
    'Pressure gauge accurate',
    'Water flow consistent',
    'No leaks detected',
    'Engine RPM stable',
    'Discharge pressure adequate'
  ];

  const getVehicleSpecificChecklist = (vehicleId) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return testDriveChecklist;

    let checklist = [...testDriveChecklist];
    
    if (vehicleId === 'pump-truck') {
      checklist.push('Emergency lights operational');
    } else if (vehicleId === 'rescue-boat') {
      checklist = checklist.filter(item => item !== 'Tires in good condition');
      checklist.push('Special marine lights operational');
      checklist.push('Radio communication works');
    }
    
    return checklist;
  };

  const UnifiedDashboard = () => {
    const sortedVehicles = getSortedVehicles();
    
    return (
      <div className="space-y-4 max-w-sm mx-auto">
        <h2 className="text-xl font-bold text-gray-800 text-center flex items-center justify-center">
          <Wrench className="w-6 h-6 mr-2" />
          WISAR Fleet Status
        </h2>
        
        <div className="space-y-3">
          {sortedVehicles.map(vehicle => {
            const VehicleIcon = getVehicleIcon(vehicle.type);
            const vehicleStatus = getVehicleStatus(vehicle);
            const { status, daysOverdue } = vehicleStatus;
            
            const statusColor = status === 'operational' ? 'text-green-600' : 'text-red-600';
            const statusBg = status === 'operational' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
            
            return (
              <div 
                key={vehicle.id}
                className={`${statusBg} border-2 rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => setSelectedVehicle(vehicle.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <VehicleIcon className={`w-6 h-6 ${statusColor} mr-2 flex-shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-gray-800 text-sm leading-tight">{vehicle.name}</h3>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`text-xs font-medium ${statusColor} mb-1`}>
                      {status === 'operational' ? '✓ OK' : `❌ ${daysOverdue}d OVERDUE`}
                    </span>
                    {vehicle.has_pump && (
                      <div className="text-xs text-blue-600 flex items-center">
                        <Wrench className="w-3 h-3 mr-1" />
                        PUMP
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-600">
                  <span>Last Test:</span>
                  <span className="font-medium">{vehicle.last_test}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 mt-6">
          <h3 className="text-sm font-semibold mb-3 text-center text-gray-800">Fleet Summary</h3>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="text-lg font-bold text-green-600">
                {sortedVehicles.filter(v => getVehicleStatus(v).status === 'operational').length}
              </div>
              <div className="text-green-800">Operational</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <div className="text-lg font-bold text-red-600">
                {sortedVehicles.filter(v => getVehicleStatus(v).status === 'needs-inspection').length}
              </div>
              <div className="text-red-800">Need Inspection</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const VehicleDetailPage = ({ vehicleId }) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    const [activeTab, setActiveTab] = useState('test-drive');
    const [testForm, setTestForm] = useState({
      tester: '',
      notes: '',
      checklist: getVehicleSpecificChecklist(vehicleId).map(item => ({ item, passed: false }))
    });
    const [pumpForm, setPumpForm] = useState({
      tester: '',
      notes: '',
      checklist: pumpTestChecklist.map(item => ({ item, passed: false }))
    });

    if (!vehicle) return null;

    const VehicleIcon = getVehicleIcon(vehicle.type);

    const handleTestDriveSubmit = () => {
      if (!testForm.tester) {
        alert('Please select a tester');
        return;
      }
      addTestLog(vehicleId, testForm, 'drive');
      setTestForm({
        tester: '',
        notes: '',
        checklist: getVehicleSpecificChecklist(vehicleId).map(item => ({ item, passed: false }))
      });
      alert('Test drive logged successfully!');
    };

    const handlePumpTestSubmit = () => {
      if (!pumpForm.tester) {
        alert('Please select a tester');
        return;
      }
      addTestLog(vehicleId, pumpForm, 'pump');
      setPumpForm({
        tester: '',
        notes: '',
        checklist: pumpTestChecklist.map(item => ({ item, passed: false }))
      });
      alert('Pump test logged successfully!');
    };

    const vehicleLogs = testLogs.filter(log => log.vehicle_id === vehicleId);

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <VehicleIcon className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h2 className="text-lg font-bold text-gray-800">{vehicle.name}</h2>
                <p className="text-sm text-gray-600">Last test: {vehicle.last_test}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedVehicle(null)}
              className="px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
            >
              Back
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setActiveTab('test-drive')}
              className={`px-3 py-2 rounded-lg text-sm ${activeTab === 'test-drive' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              Test Drive
            </button>
            {vehicle.has_pump && (
              <button
                onClick={() => setActiveTab('pump-test')}
                className={`px-3 py-2 rounded-lg text-sm ${activeTab === 'pump-test' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Pump Test
              </button>
            )}
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-2 rounded-lg text-sm ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              History
            </button>
          </div>

          {activeTab === 'test-drive' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-semibold">Weekly Test Drive</h3>
                <button
                  onClick={() => {
                    const selectedDriver = drivers[0] || 'Quick Check';
                    const quickTestData = {
                      tester: selectedDriver,
                      notes: `Quick check - all systems operational for ${vehicle.name}`,
                      checklist: getVehicleSpecificChecklist(vehicleId).map(item => ({ item, passed: true }))
                    };
                    addTestLog(vehicleId, quickTestData, 'drive');
                    alert(`✅ Quick test drive logged for ${vehicle.name}!`);
                  }}
                  className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 flex items-center text-sm"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Quick Log
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="flex gap-2">
                  <select
                    value={testForm.tester}
                    onChange={(e) => setTestForm({...testForm, tester: e.target.value})}
                    className="flex-1 p-2 border rounded-lg text-sm"
                  >
                    <option value="">Select Tester</option>
                    {drivers.map(driver => (
                      <option key={driver} value={driver}>{driver}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add new driver"
                    value={newDriverName}
                    onChange={(e) => setNewDriverName(e.target.value)}
                    className="flex-1 p-2 border rounded-lg text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && addDriver()}
                  />
                  <button
                    onClick={addDriver}
                    className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Checklist Items:</h4>
                {testForm.checklist.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      checked={item.passed}
                      onChange={(e) => {
                        const newChecklist = [...testForm.checklist];
                        newChecklist[index].passed = e.target.checked;
                        setTestForm({...testForm, checklist: newChecklist});
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{item.item}</span>
                  </div>
                ))}
              </div>

              <textarea
                placeholder="Additional Notes"
                value={testForm.notes}
                onChange={(e) => setTestForm({...testForm, notes: e.target.value})}
                className="w-full p-2 border rounded-lg h-20 text-sm"
              />

              <button
                onClick={handleTestDriveSubmit}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Submit Test Drive Log
              </button>
            </div>
          )}

          {activeTab === 'pump-test' && vehicle.has_pump && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-semibold">Fire Pump Test</h3>
                <button
                  onClick={() => {
                    const selectedDriver = drivers[0] || 'Quick Check';
                    const quickPumpData = {
                      tester: selectedDriver,
                      notes: `Quick pump check - all systems operational for ${vehicle.name}`,
                      checklist: pumpTestChecklist.map(item => ({ item, passed: true }))
                    };
                    addTestLog(vehicleId, quickPumpData, 'pump');
                    alert(`🚒 Quick pump test logged for ${vehicle.name}!`);
                  }}
                  className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 flex items-center text-sm"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Quick Log
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="flex gap-2">
                  <select
                    value={pumpForm.tester}
                    onChange={(e) => setPumpForm({...pumpForm, tester: e.target.value})}
                    className="flex-1 p-2 border rounded-lg text-sm"
                  >
                    <option value="">Select Tester</option>
                    {drivers.map(driver => (
                      <option key={driver} value={driver}>{driver}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add new driver"
                    value={newDriverName}
                    onChange={(e) => setNewDriverName(e.target.value)}
                    className="flex-1 p-2 border rounded-lg text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && addDriver()}
                  />
                  <button
                    onClick={addDriver}
                    className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Pump Test Checklist:</h4>
                {pumpForm.checklist.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      checked={item.passed}
                      onChange={(e) => {
                        const newChecklist = [...pumpForm.checklist];
                        newChecklist[index].passed = e.target.checked;
                        setPumpForm({...pumpForm, checklist: newChecklist});
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{item.item}</span>
                  </div>
                ))}
              </div>

              <textarea
                placeholder="Additional Notes"
                value={pumpForm.notes}
                onChange={(e) => setPumpForm({...pumpForm, notes: e.target.value})}
                className="w-full p-2 border rounded-lg h-20 text-sm"
              />

              <button
                onClick={handlePumpTestSubmit}
                className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
              >
                Submit Pump Test Log
              </button>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold">Test History</h3>
              
              {vehicleLogs.length > 0 ? (
                <div className="space-y-2">
                  {vehicleLogs.slice(0, 10).map(log => (
                    <div key={log.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{log.test_date} - {log.tester}</span>
                        <span className={`px-2 py-1 rounded text-xs ${log.status === 'pass' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {log.test_type.toUpperCase()} - {log.status.toUpperCase()}
                        </span>
                      </div>
                      {log.notes && <p className="text-sm text-gray-700 mt-1">{log.notes}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No test logs yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Wrench className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading WISAR Vehicle Log...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-800 text-white p-3 shadow-lg">
        <div className="max-w-sm mx-auto text-center">
          <div className="flex items-center justify-center space-x-2">
            <Wrench className="w-6 h-6" />
            <div>
              <h1 className="text-lg font-bold">WISAR Vehicle Log</h1>
              <p className="text-blue-200 text-xs">Water Island S&R</p>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-blue-700 text-white p-2">
        <div className="max-w-sm mx-auto flex justify-center">
          <button
            onClick={() => setSelectedVehicle(null)}
            className="px-4 py-2 rounded text-sm bg-blue-900"
          >
            Fleet Dashboard
          </button>
        </div>
      </nav>

      <main className="max-w-sm mx-auto p-4">
        {selectedVehicle ? (
          <VehicleDetailPage vehicleId={selectedVehicle} />
        ) : (
          <UnifiedDashboard />
        )}
      </main>

      <footer className="bg-gray-800 text-white p-4 mt-12">
        <div className="max-w-sm mx-auto text-center">
          <p className="text-sm">&copy; 2025 Water Island Search & Rescue</p>
          <p className="text-gray-400 text-xs">Vehicle Maintenance System</p>
        </div>
      </footer>
    </div>
  );
};

export default WISARVehicleLog;
