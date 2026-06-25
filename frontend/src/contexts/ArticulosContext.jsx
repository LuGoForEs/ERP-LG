import React from 'react';
import { V2_MOCK } from '../data/mock';
import { api } from '../api';
import { Field, Input, Select } from '../components/primitives';

const ArticulosContext = React.createContext({ articulos: [], create: async () => {} });

export function ArticulosProvider({ children }) {
  const [articulos, setArticulos] = React.useState([]);

  const load = React.useCallback(async () => {
    try {
      const data = await api.compras.getInsumos();
      setArticulos(data.map(i => ({
        ...i,
        cantidad: 0,
        fecha_alta: i.created_at ? i.created_at.split('T')[0] : '—',
      })));
    } catch (e) {
      console.error('Error cargando artículos:', e);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const create = React.useCallback(async (form) => {
    const result = await api.compras.createInsumo({
      nombre: form.nombre,
      categoria: form.categoria,
      subcategoria: form.subcategoria,
      unidad: form.unidad,
      cantidad: parseFloat(form.cantidad) || 0,
    });
    await load();
    return result;
  }, [load]);

  return (
    <ArticulosContext.Provider value={{ articulos, create }}>
      {children}
    </ArticulosContext.Provider>
  );
}

export function useSharedArticulos() {
  return React.useContext(ArticulosContext);
}

export function ArticuloForm({ value, onChange }) {
  const cats = V2_MOCK.categorias;
  const cat = cats.find(c => c.id === value.categoria);
  const subs = cat ? cat.subcategorias : [];

  React.useEffect(() => {
    if (cat && !subs.includes(value.subcategoria)) {
      onChange({ ...value, subcategoria: subs[0] || '' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.categoria]);

  return (
    <div className="space-y-3">
      <Field label="Nombre" required>
        <Input
          value={value.nombre}
          onChange={e => onChange({ ...value, nombre: e.target.value })}
          placeholder="Ej: Chapa AISI 316L e=2mm"
          autoFocus
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoría" required>
          <Select
            value={value.categoria}
            onChange={e => onChange({ ...value, categoria: e.target.value })}
            options={[{ value: '', label: 'Seleccionar...' }, ...cats.map(c => ({ value: c.id, label: c.nombre }))]}
          />
        </Field>
        <Field label="Subcategoría" required>
          <Select
            value={value.subcategoria}
            onChange={e => onChange({ ...value, subcategoria: e.target.value })}
            options={subs.length === 0
              ? [{ value: '', label: '— elegí categoría —' }]
              : subs.map(s => ({ value: s, label: s }))}
          />
        </Field>
      </div>
      <div className="grid grid-cols-[1fr_120px] gap-3">
        <Field label="Cantidad inicial" required>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={value.cantidad}
            onChange={e => onChange({ ...value, cantidad: e.target.value })}
            placeholder="0"
          />
        </Field>
        <Field label="Unidad" required>
          <Select
            value={value.unidad}
            onChange={e => onChange({ ...value, unidad: e.target.value })}
            options={['u','m','kg','L','m²','rollos'].map(u => ({ value: u, label: u }))}
          />
        </Field>
      </div>
    </div>
  );
}

export const V2_EMPTY_ARTICULO = { nombre: '', categoria: '', subcategoria: '', unidad: 'u', cantidad: '' };

export function articuloIsValid(a) {
  return a.nombre.trim() && a.categoria && a.subcategoria && a.unidad && a.cantidad !== '' && parseFloat(a.cantidad) >= 0;
}
