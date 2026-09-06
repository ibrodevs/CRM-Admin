import { Button } from './Button.jsx';

function Pagination({ page, pages, onPage }) {
  return (
    <div className="pagination">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Назад</Button>
      <div className="page-info">Страница {page} из {pages}</div>
      <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Вперед</Button>
    </div>
  );
}

export { Pagination };
