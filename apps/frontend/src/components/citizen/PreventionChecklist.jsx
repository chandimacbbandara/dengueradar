import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '../Icon.jsx';

const defaultTasks = [
  { id: '1', text: 'Remove standing water around the house' },
  { id: '2', text: 'Cover water containers and tanks securely' },
  { id: '3', text: 'Clean roof gutters and drains' },
  { id: '4', text: 'Check flower pots for stagnant water' },
  { id: '5', text: 'Clear blocked outdoor drains' },
  { id: '6', text: 'Dispose of discarded tires and containers' }
];

export default function PreventionChecklist() {
  const { t } = useTranslation();
  const [checked, setChecked] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('dengueradar_checklist');
      if (stored) setChecked(JSON.parse(stored));
    } catch(err) {}
  }, []);

  const toggle = (id) => {
    let next;
    if (checked.includes(id)) {
      next = checked.filter(c => c !== id);
    } else {
      next = [...checked, id];
    }
    setChecked(next);
    localStorage.setItem('dengueradar_checklist', JSON.stringify(next));
  };

  const progress = Math.round((checked.length / defaultTasks.length) * 100);

  return (
    <div className="card" style={{ padding: '24px', height: '100%' }}>
      <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '16px' }}>{t('dashboard_components.checklist.title')}</h3>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
        <span style={{ color: 'var(--text-2)' }}>Prevention Checklist</span>
        <span style={{ color: 'var(--teal)' }}>{checked.length} / {defaultTasks.length} completed</span>
      </div>
      
      <div style={{ width: '100%', height: '6px', background: 'var(--surface-2)', borderRadius: '3px', marginBottom: '24px', overflow: 'hidden' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: 'var(--teal)', transition: 'width 0.3s ease' }}></div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {defaultTasks.map(task => {
          const isChecked = checked.includes(task.id);
          return (
            <div key={task.id} 
                 onClick={() => toggle(task.id)}
                 style={{ 
                   display: 'flex', alignItems: 'center', gap: '12px', 
                   padding: '12px', borderRadius: '8px', cursor: 'pointer',
                   background: isChecked ? 'var(--teal-bg)' : 'var(--surface-2)',
                   border: `1px solid ${isChecked ? 'var(--teal)' : 'transparent'}`,
                   transition: 'all 0.2s'
                 }}>
              <div style={{ 
                width: '20px', height: '20px', borderRadius: '4px', 
                border: `2px solid ${isChecked ? 'var(--teal)' : 'var(--text-3)'}`,
                background: isChecked ? 'var(--teal)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {isChecked && <Icon name="check" size={14} color="#fff" />}
              </div>
              <span style={{ fontSize: '14px', color: isChecked ? 'var(--text)' : 'var(--text-2)', textDecoration: isChecked ? 'line-through' : 'none' }}>
                {task.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
