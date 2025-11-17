import React, { useState, useEffect } from 'react';
import { Scale, Plus, Edit2, Trash2, Save, X, Wifi, WifiOff } from 'lucide-react';
import { storage } from './storage';

export default function App() {
  const [port, setPort] = useState(null);
  const [reader, setReader] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentWeight, setCurrentWeight] = useState(0);
  const [records, setRecords] = useState([]);
  const [category, setCategory] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ weight: '', category: '' });

  // Cargar registros al iniciar
  useEffect(() => {
    const loadRecords = async () => {
      const loadedRecords = await storage.getAll();
      setRecords(loadedRecords);
    };
    loadRecords();
  }, []);

  // Conectar al puerto serial
  const connectToArduino = async () => {
    try {
      console.log('🔌 Solicitando puerto...');
      
      if (!('serial' in navigator)) {
        alert('❌ Tu navegador no soporta Web Serial API. Usa Chrome o Edge.');
        return;
      }

      const selectedPort = await navigator.serial.requestPort();
      console.log('✅ Puerto seleccionado');
      
      await selectedPort.open({ baudRate: 57600 });
      console.log('✅ Puerto abierto a 57600 baud');
      
      setPort(selectedPort);
      setIsConnected(true);

      // Crear stream de lectura
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = selectedPort.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      
      setReader(reader);
      console.log('✅ Lector configurado, esperando datos...');

      // Leer datos
      readSerialData(reader);
      
    } catch (error) {
      console.error('❌ Error completo:', error);
      console.error('Nombre del error:', error.name);
      console.error('Mensaje:', error.message);
      
      if (error.name === 'NotFoundError') {
        alert('❌ No seleccionaste ningún puerto.');
      } else if (error.name === 'InvalidStateError') {
        alert('❌ El puerto está siendo usado por otro programa.\n\n¡CIERRA ARDUINO IDE completamente!');
      } else if (error.name === 'NetworkError') {
        alert('❌ No se puede acceder al puerto.\n\nDesconecta y vuelve a conectar el Arduino.');
      } else {
        alert(`❌ Error: ${error.message}\n\nAsegúrate de:\n1. Cerrar Arduino IDE\n2. Usar Chrome/Edge\n3. Desconectar y reconectar el Arduino`);
      }
    }
  };

  // Leer datos seriales
  const readSerialData = async (reader) => {
    let buffer = '';
    console.log('🎧 Iniciando lectura de datos...');
    
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          console.log('⏹️ Lectura terminada');
          break;
        }
        
        console.log('📥 Datos crudos recibidos:', value);
        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          console.log('📡 Línea completa:', trimmedLine);
          
          if (trimmedLine.includes('Load_cell output val:')) {
            console.log('✅ Línea de peso detectada!');
            const weightMatch = trimmedLine.match(/Load_cell output val:\s*([-+]?\d*\.?\d+)/);
            
            if (weightMatch) {
              const weight = parseFloat(weightMatch[1]);
              console.log('⚖️ Peso extraído:', weight);
              
              if (!isNaN(weight)) {
                console.log('✅ Actualizando peso a:', weight);
                setCurrentWeight(weight);
              } else {
                console.log('❌ Peso no es un número válido');
              }
            } else {
              console.log('❌ No se pudo extraer el peso de la línea');
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error en lectura:', error);
      setIsConnected(false);
    }
  };

  // Desconectar
  const disconnect = async () => {
    console.log('🔌 Desconectando...');
    
    if (reader) {
      try {
        await reader.cancel();
        console.log('✅ Reader cancelado');
      } catch (e) {
        console.log('⚠️ Error cancelando reader:', e);
      }
      setReader(null);
    }
    
    if (port) {
      try {
        await port.close();
        console.log('✅ Puerto cerrado');
      } catch (e) {
        console.log('⚠️ Error cerrando puerto:', e);
      }
      setPort(null);
    }
    
    setIsConnected(false);
    setCurrentWeight(0);
    console.log('✅ Desconectado completamente');
  };

  // Guardar registro
  const saveRecord = async () => {
    if (!category.trim()) {
      alert('Por favor ingresa una categoría');
      return;
    }

    const newRecord = {
      id: Date.now().toString(),
      weight: currentWeight,
      category: category.trim(),
      timestamp: Date.now(),
      date: new Date().toLocaleString('es-CO')
    };

    await storage.save(newRecord);
    setRecords([newRecord, ...records]);
    setCategory('');
    alert('✅ Registro guardado exitosamente');
  };

  // Editar registro
  const startEdit = (record) => {
    setEditingId(record.id);
    setEditForm({ weight: record.weight, category: record.category });
  };

  const saveEdit = async () => {
    const updatedRecord = {
      ...records.find(r => r.id === editingId),
      weight: parseFloat(editForm.weight),
      category: editForm.category.trim(),
      date: new Date().toLocaleString('es-CO')
    };

    await storage.update(editingId, updatedRecord);
    setRecords(records.map(r => r.id === editingId ? updatedRecord : r));
    setEditingId(null);
    setEditForm({ weight: '', category: '' });
    alert('✅ Registro actualizado');
  };

  // Eliminar registro
  const deleteRecord = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return;

    await storage.delete(id);
    setRecords(records.filter(r => r.id !== id));
    alert('✅ Registro eliminado');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Scale className="w-8 h-8 text-indigo-600" />
              <h1 className="text-3xl font-bold text-gray-800">Monitor de Peso Arduino</h1>
            </div>
            <button
              onClick={isConnected ? disconnect : connectToArduino}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                isConnected
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {isConnected ? (
                <>
                  <WifiOff className="w-5 h-5" />
                  Desconectar
                </>
              ) : (
                <>
                  <Wifi className="w-5 h-5" />
                  Conectar Arduino
                </>
              )}
            </button>
          </div>

          {/* Peso actual */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-8 text-white mb-6">
            <p className="text-lg mb-2 opacity-90">Peso Actual</p>
            <p className="text-6xl font-bold mb-4">{currentWeight.toFixed(2)} g</p>
            <div className="flex gap-4">
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ej: Producto A, Caja 1, etc."
                className="flex-1 px-4 py-3 rounded-lg text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-white"
                disabled={!isConnected}
              />
              <button
                onClick={saveRecord}
                disabled={!isConnected || !category.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
                Guardar
              </button>
            </div>
          </div>

          {!isConnected && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-yellow-800 font-medium">
                ⚠️ Conecta tu Arduino para comenzar a medir. Usa Chrome o Edge.
              </p>
            </div>
          )}
        </div>

        {/* Tabla CRUD */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Save className="w-6 h-6 text-indigo-600" />
            Registros Guardados ({records.length})
          </h2>

          {records.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Scale className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No hay registros guardados</p>
              <p className="text-sm mt-2">Conecta el Arduino y guarda tu primer registro</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Fecha</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Categoría</th>
                    <th className="text-right py-4 px-4 font-semibold text-gray-700">Peso (g)</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      {editingId === record.id ? (
                        <>
                          <td className="py-4 px-4 text-sm text-gray-600">{record.date}</td>
                          <td className="py-4 px-4">
                            <input
                              type="text"
                              value={editForm.category}
                              onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="py-4 px-4">
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.weight}
                              onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={saveEdit}
                                className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                title="Guardar"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors"
                                title="Cancelar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-4 px-4 text-sm text-gray-600">{record.date}</td>
                          <td className="py-4 px-4 font-medium text-gray-800">{record.category}</td>
                          <td className="py-4 px-4 text-right font-bold text-indigo-600">
                            {record.weight.toFixed(2)}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => startEdit(record)}
                                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteRecord(record.id)}
                                className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}