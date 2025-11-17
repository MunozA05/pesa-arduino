// Sistema de almacenamiento local para los registros de peso
const STORAGE_KEY = 'weight_records';

export const storage = {
  // Obtener todos los registros
  getAll: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data).sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error al cargar registros:', error);
      return [];
    }
  },

  // Guardar un nuevo registro
  save: (record) => {
    try {
      const records = storage.getAll();
      records.push(record);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      return true;
    } catch (error) {
      console.error('Error al guardar registro:', error);
      return false;
    }
  },

  // Actualizar un registro existente
  update: (id, updatedRecord) => {
    try {
      const records = storage.getAll();
      const index = records.findIndex(r => r.id === id);
      if (index !== -1) {
        records[index] = updatedRecord;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error al actualizar registro:', error);
      return false;
    }
  },

  // Eliminar un registro
  delete: (id) => {
    try {
      const records = storage.getAll();
      const filtered = records.filter(r => r.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error al eliminar registro:', error);
      return false;
    }
  },

  // Limpiar todos los registros
  clear: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Error al limpiar registros:', error);
      return false;
    }
  }
};