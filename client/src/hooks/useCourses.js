import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import BASE from '../lib/api';

export function useCourses() {
  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const [search,         setSearch]         = useState('');
  const [selectedAreas,  setSelectedAreas]  = useState([]);
  const [selectedCredit, setSelectedCredit] = useState('all');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedTerm,   setSelectedTerm]   = useState('all');

  const filterVersion = useRef(0);
  const isFirstRender = useRef(true);

  const fetchCourses = useCallback(() => {
    setLoading(true);
    fetch(`${BASE}/api/courses`)
      .then(r => { if (!r.ok) throw new Error(`Server error ${r.status}`); return r.json(); })
      .then(data => { setAllCourses(data); setError(null); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const areas    = useMemo(() => [...new Set(allCourses.map(c => c.area))].sort(), [allCourses]);
  const faculties = useMemo(() => {
    const names = new Set();
    allCourses.forEach(c => {
      if (c.professor1_name) names.add(c.professor1_name);
      if (c.professor2_name) names.add(c.professor2_name);
    });
    return [...names].sort();
  }, [allCourses]);
  const terms    = useMemo(() => {
    const order = ['Term IV', 'Term V', 'Term VI', 'X'];
    const unique = [...new Set(allCourses.map(c => c.term))];
    return unique.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [allCourses]);

  const filtered = useMemo(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
    } else {
      filterVersion.current += 1;
    }
    let result = allCourses;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.course.toLowerCase().includes(q) ||
        (c.professor1_name || '').toLowerCase().includes(q) ||
        (c.professor2_name || '').toLowerCase().includes(q) ||
        c.area.toLowerCase().includes(q)
      );
    }
    if (selectedAreas.length > 0) {
      result = result.filter(c => selectedAreas.includes(c.area));
    }
    if (selectedCredit !== 'all') {
      result = result.filter(c => parseFloat(c.credits) === parseFloat(selectedCredit));
    }
    if (selectedFaculty) {
      const q = selectedFaculty.toLowerCase();
      result = result.filter(c =>
        (c.professor1_name || '').toLowerCase().includes(q) ||
        (c.professor2_name || '').toLowerCase().includes(q)
      );
    }
    if (selectedTerm !== 'all') {
      result = result.filter(c => c.term === selectedTerm);
    }

    return result;
  }, [allCourses, search, selectedAreas, selectedCredit, selectedFaculty, selectedTerm]);

  const toggleArea = (area) => {
    setSelectedAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  const clearAll = () => {
    setSearch('');
    setSelectedAreas([]);
    setSelectedCredit('all');
    setSelectedFaculty('');
    setSelectedTerm('all');
  };

  const hasFilters = search || selectedAreas.length > 0 || selectedCredit !== 'all' || selectedFaculty || selectedTerm !== 'all';

  return {
    loading, error,
    filtered, allCourses,
    areas, faculties, terms,
    search, setSearch,
    selectedAreas, toggleArea,
    selectedCredit, setSelectedCredit,
    selectedFaculty, setSelectedFaculty,
    selectedTerm, setSelectedTerm,
    clearAll, hasFilters,
    filterVersion,
    refetchCourses: fetchCourses,
  };
}
