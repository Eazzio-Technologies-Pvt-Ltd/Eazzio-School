import React, { useState } from 'react';
import EmptyState from './EmptyState';

export default function DataTable({
  columns = [],
  data = [],
  searchPlaceholder = 'Search records...',
  searchKey = '',
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredData = data.filter((row) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    
    if (searchKey) {
      const val = row[searchKey];
      return val ? String(val).toLowerCase().includes(q) : false;
    }

    // Default search across all properties of the row
    return Object.keys(row).some((k) => {
      const val = row[k];
      if (typeof val === 'object' && val !== null) {
        return Object.keys(val).some(subK => String(val[subK]).toLowerCase().includes(q));
      }
      return val ? String(val).toLowerCase().includes(q) : false;
    });
  });

  return (
    <div style={styles.container}>
      <div style={styles.searchBar}>
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div style={styles.tableContainer}>
        {filteredData.length === 0 ? (
          <EmptyState description="No records matched your search query." />
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                {columns.map((col, idx) => (
                  <th key={idx} style={styles.th}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, rowIdx) => (
                <tr key={rowIdx} style={styles.tr}>
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} style={styles.td}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
  },
  searchBar: {
    marginBottom: '20px',
    maxWidth: '320px',
  },
  searchInput: {
    background: 'var(--input-bg)',
    border: '1px solid var(--glass-border)',
  },
  tableContainer: {
    overflowX: 'auto',
    width: '100%',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  thRow: {
    borderBottom: '2px solid var(--glass-border)',
  },
  th: {
    color: 'var(--text-secondary)',
    padding: '14px 16px',
    fontWeight: '600',
    fontSize: '0.9rem',
  },
  td: {
    padding: '16px',
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--glass-border)',
    fontSize: '0.95rem',
  },
  tr: {
    transition: 'var(--transition-fast)',
    '&:hover': {
      background: 'var(--bg-card-hover)',
    },
  },
};
