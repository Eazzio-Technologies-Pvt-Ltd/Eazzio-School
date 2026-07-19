import React, { useState, useEffect } from 'react';
import { getNotices } from '../../api/studentApi';
import Loader from '../../components/Loader';
import { Megaphone, Calendar as CalendarIcon, Users } from 'lucide-react';

export default function Notices() {
  const [notices, setNotices] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadNotices = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await getNotices();
        // Backend returns notices sorted by date DESC, so they are already most recent first
        setNotices(res);
      } catch (err) {
        console.error(err);
        setError('Failed to load notices.');
      } finally {
        setLoading(false);
      }
    };
    loadNotices();
  }, []);

  if (loading) return <Loader message="Loading Notice Board..." />;
  if (error) return <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg">{error}</div>;
  if (!notices) return null;

  return (
    <div className="flex flex-col gap-8 animate-fade-in text-gray-800">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Notice Board</h2>
        <p className="text-gray-500">Stay up to date with official school and class announcements.</p>
      </div>

      <div className="flex flex-col gap-6">
        {notices.length === 0 ? (
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Megaphone className="text-gray-300" size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-700">No active notices</h3>
            <p className="text-gray-500 max-w-sm mt-2">There are currently no announcements for your class or the general student body.</p>
          </div>
        ) : (
          notices.map((notice) => (
            <div key={notice.id} className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 hover:shadow-md transition-shadow relative overflow-hidden group">
              
              {/* Decorative accent bar */}
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500 group-hover:w-2 transition-all"></div>
              
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4 pl-3">
                <div className="flex flex-col gap-1">
                  <h3 className="text-xl font-bold text-gray-900 leading-tight">
                    {notice.title}
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-xs font-medium text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <CalendarIcon size={14} className="text-gray-400" />
                      {new Date(notice.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users size={14} className="text-gray-400" />
                      Audience: <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${notice.audience === 'SCHOOL' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>{notice.audience}</span>
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="pl-3">
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {notice.content}
                </p>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
}
