import { useState } from 'react';
import CourseCard from './CourseCard';
import '../styles/CourseCard.css';

function DeleteConfirmModal({ course, onConfirm, onCancel }) {
  return (
    <div className="clear-modal-backdrop" onClick={onCancel}>
      <div className="clear-modal" onClick={e => e.stopPropagation()}>
        <div className="clear-modal-icon">🗑️</div>
        <h3 className="clear-modal-title">Delete Course?</h3>
        <p className="clear-modal-body">
          This will permanently delete <strong>{course.course}</strong>. This action cannot be undone.
        </p>
        <div className="clear-modal-actions">
          <button className="clear-confirm-no"  onClick={onCancel}>Cancel</button>
          <button className="clear-confirm-yes" onClick={onConfirm}>Yes, delete</button>
        </div>
      </div>
    </div>
  );
}

export default function CourseGrid({
  courses, total, filterVersion,
  basket, backupCourses = new Set(), toggleBasket, toggleBackup, onExpand,
  isAdmin, onAddCourse, onDeleteCourse,
}) {
  const version = filterVersion.current;
  const [pendingDelete, setPendingDelete] = useState(null);

  function handleDeleteClick(course) { setPendingDelete(course); }
  function handleConfirmDelete() {
    onDeleteCourse && onDeleteCourse(pendingDelete);
    setPendingDelete(null);
  }

  return (
    <main className="course-grid-wrap">
      <div className="results-bar">
        <p className="results-count">
          Showing <span>{courses.length}</span> of {total} courses
        </p>
        {!isAdmin && basket.size > 0 && (
          <p className="results-count">
            <span>{basket.size}</span> courses in planner
          </p>
        )}
        {!isAdmin && basket.size === 0 && (
          <p className="results-count" style={{ fontStyle: 'italic' }}>
            Click a card to view details &amp; add to planner
          </p>
        )}
      </div>

      <div className="course-grid">
        {/* Admin: Add Course tile (first position) */}
        {isAdmin && (
          <div className="card-wrapper">
            <button className="add-course-tile" onClick={onAddCourse}>
              <div className="add-course-icon">＋</div>
              <span className="add-course-label">Add Course</span>
            </button>
          </div>
        )}

        {courses.length === 0 ? (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <h3>No courses found</h3>
            <p>Try adjusting your filters or search term.</p>
          </div>
        ) : (
          courses.map((c, i) => (
            <div
              key={`${c.id}-${version}`}
              className={`card-wrapper ${version === 0 ? 'anim-initial' : 'anim-filter'}`}
              style={{ animationDelay: `${Math.min(i * 0.03, 0.4)}s` }}
            >
              <CourseCard
                course={c}
                selected={basket.has(c.id)}
                isBackup={backupCourses.has(c.id)}
                onToggle={toggleBasket}
                onToggleBackup={toggleBackup}
                onExpand={onExpand}
                isAdmin={isAdmin}
                onDelete={handleDeleteClick}
              />
            </div>
          ))
        )}
      </div>

      {pendingDelete && (
        <DeleteConfirmModal
          course={pendingDelete}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </main>
  );
}
