import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function SubjectsBadge({ subjects = [], courseLabel = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const popoverRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!isOpen) {
      updateCoords();
    }
    setIsOpen((prev) => !prev);
  };

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX + rect.width / 2,
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        popoverRef.current && !popoverRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    const handleScrollResize = () => {
      if (isOpen) {
        updateCoords();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      window.addEventListener('scroll', handleScrollResize, true);
      window.addEventListener('resize', handleScrollResize);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScrollResize, true);
      window.removeEventListener('resize', handleScrollResize);
    };
  }, [isOpen]);

  const count = subjects.length;

  return (
    <>
      <div style={{ display: 'inline-block' }} ref={containerRef}>
        <button
          type="button"
          onClick={handleToggle}
          aria-label={`View subjects for ${courseLabel}`}
          aria-expanded={isOpen}
          style={{
            background: count > 0 ? 'rgba(5, 150, 105, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${count > 0 ? 'rgba(5, 150, 105, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
            color: count > 0 ? 'var(--primary)' : 'var(--text-muted)',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: '500',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
              if(count > 0) e.currentTarget.style.background = 'rgba(5, 150, 105, 0.2)';
              else e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
          }}
          onMouseLeave={(e) => {
              if(count > 0) e.currentTarget.style.background = 'rgba(5, 150, 105, 0.1)';
              else e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
          }}
        >
          {count > 0 ? `${count} ${count === 1 ? 'subject' : 'subjects'}` : 'No subjects'}
          {count > 0 && <span style={{ fontSize: '0.7rem' }}>▼</span>}
        </button>
      </div>

      {isOpen && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: 'absolute',
            top: coords.top,
            left: coords.left,
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-glow)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            width: 'max-content',
            minWidth: '220px',
            maxWidth: '300px',
            padding: '12px',
            animation: 'fadeIn 0.2s ease-out forwards',
          }}
        >
          <div style={{
              position: 'absolute',
              top: '-5px',
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              width: '10px',
              height: '10px',
              background: 'var(--bg-card)',
              borderLeft: '1px solid var(--border-glow)',
              borderTop: '1px solid var(--border-glow)',
          }}></div>

          <div style={{ position: 'relative', zIndex: 2 }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
              Subjects – {courseLabel}
            </h4>
            
            {count > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {subjects.map((cs) => (
                  <li key={cs.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', padding: '4px 0', textAlign: 'left', gap: '10px' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{cs.subject}</strong>
                    <span style={{ color: 'var(--text-muted)' }}>{cs.teacher?.name || 'Unassigned'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, textAlign: 'left' }}>No subjects assigned yet.</p>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
