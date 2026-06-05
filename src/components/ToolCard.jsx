import { useRef, useState } from 'react';
import { Field } from '@ark-ui/react/field';
import { Checkbox } from '@ark-ui/react/checkbox';
import Result from './Result.jsx';

function initialValues(inputs) {
  const v = {};
  for (const i of inputs) v[i.id] = i.type === 'checkbox' ? !!i.checked : (i.value ?? '');
  return v;
}

function Input({ spec, value, onChange }) {
  const set = (val) => onChange(spec.id, val);
  if (spec.type === 'textarea')
    return (
      <Field.Root>
        <Field.Label>{spec.label}</Field.Label>
        <Field.Textarea rows={5} value={value} placeholder={spec.placeholder}
          onChange={(e) => set(e.target.value)} />
      </Field.Root>
    );
  if (spec.type === 'select')
    return (
      <Field.Root>
        <Field.Label>{spec.label}</Field.Label>
        <select value={value} onChange={(e) => set(e.target.value)} className="select">
          {spec.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </Field.Root>
    );
  if (spec.type === 'checkbox')
    return (
      <Checkbox.Root checked={value} onCheckedChange={(d) => set(!!d.checked)}>
        <Checkbox.Control />
        <Checkbox.Label>{spec.label}</Checkbox.Label>
      </Checkbox.Root>
    );
  return (
    <Field.Root>
      <Field.Label>{spec.label}</Field.Label>
      <Field.Input type={spec.type} value={value}
        placeholder={spec.placeholder} onChange={(e) => set(e.target.value)} />
    </Field.Root>
  );
}

export default function ToolCard({ tool }) {
  const [values, setValues] = useState(() => initialValues(tool.inputs));
  const [out, setOut] = useState({ value: null, error: null });
  const [pending, setPending] = useState(false);
  const previewRef = useRef(null);
  const onChange = (id, val) => setValues((v) => ({ ...v, [id]: val }));
  const run = async (action) => {
    if (pending) return;
    setPending(true);
    try {
      const r = await action.run(values, { preview: previewRef.current });
      setOut({ value: r, error: null });
    } catch (e) {
      setOut({ value: null, error: e.message || String(e) });
    } finally {
      setPending(false);
    }
  };
  return (
    <section className="card" id={tool.id}>
      <h3>{tool.title}</h3>
      {tool.inputs.map((spec) => (
        <Input key={spec.id} spec={spec} value={values[spec.id]} onChange={onChange} />
      ))}
      <div className="actions">
        {tool.actions.map((a) => (
          <button key={a.label} type="button" disabled={pending} onClick={() => run(a)}>{a.label}</button>
        ))}
      </div>
      {tool.preview && <div ref={previewRef} className="preview" />}
      <Result value={out.value} error={out.error} />
    </section>
  );
}
