import { Children, cloneElement, isValidElement } from 'react';
import { translate } from '../preferences/translations.js';
import { Icon } from '../icons/index.jsx';

const DETAIL_ROOT_LABELS = {
  'Карточка заказа': 'Заказы',
};

function Topbar({ title, sub, children }) {
  const childList = Children.toArray(children);
  const detailBack = childList.find((child) => isValidElement(child) && child.props?.title === 'Закрыть карточку');
  const isDetail = Boolean(detailBack && DETAIL_ROOT_LABELS[title]);
  const detailChildren = isDetail
    ? childList.filter((child) => child !== detailBack && !(isValidElement(child) && child.props?.className === 'topbar-spacer'))
    : [];

  return (
    <div className={'topbar' + (isDetail ? ' entity-detail-topbar' : '')}>
      <div style={{ minWidth: 0 }}>
        <h1 className="page-title">{translate(title)}</h1>
        {sub && <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4, fontWeight: 500 }}>{sub}</div>}
      </div>
      {isDetail ? (
        <div className="entity-detail-topbar-nav">
          {cloneElement(detailBack, {
            className: 'btn btn-secondary btn-sm entity-detail-back',
            title: 'К реестру',
            'aria-label': 'К реестру',
          }, <><Icon name="chevLeft" />К реестру</>)}
          <span className="entity-detail-crumb">{DETAIL_ROOT_LABELS[title]}</span>
          {detailChildren}
        </div>
      ) : children}

      {isDetail && <style jsx global>{`
        .entity-detail-topbar {
          align-items: flex-start;
          row-gap: 14px;
        }

        .entity-detail-topbar > div:first-child {
          flex: 0 0 100%;
        }

        .entity-detail-topbar-nav {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .entity-detail-topbar-nav .entity-detail-back {
          flex: 0 0 auto;
        }

        .entity-detail-crumb {
          min-width: 0;
          color: var(--muted);
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .entity-detail-topbar + .content {
          padding-top: 10px !important;
        }

        /* Карточка заказа следует тому же каркасу, что карточка компании. */
        .entity-detail-topbar + .content .oc-head {
          position: relative;
          padding: 0 !important;
          margin: 0 0 18px !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        .entity-detail-topbar + .content .oc-head > div:first-child {
          min-height: 124px !important;
          display: flex !important;
          grid-template-columns: none !important;
          align-items: center !important;
          gap: 16px !important;
          flex-wrap: wrap !important;
          padding: 22px 26px !important;
          border: 1px solid var(--line);
          border-radius: var(--r-card);
          background: var(--surface);
        }

        .entity-detail-topbar + .content .oc-head .oc-id {
          display: flex;
          align-items: center;
          gap: 10px !important;
          min-width: max-content;
          flex: 0 0 auto;
        }

        .entity-detail-topbar + .content .oc-head .oc-id h2 {
          margin: 0;
          font-size: 21px !important;
          line-height: 1.2 !important;
          letter-spacing: -.01em;
          white-space: nowrap;
        }

        .entity-detail-topbar + .content .oc-head > div:first-child > .oc-id + div {
          flex: 1 1 360px !important;
          min-width: 240px !important;
          color: var(--muted) !important;
          font-size: 14px !important;
          line-height: 1.45 !important;
        }

        .entity-detail-topbar + .content .oc-head > div:first-child > .oc-id + div > span {
          display: block;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .entity-detail-topbar + .content .oc-head > div:first-child > .oc-id + div + div {
          display: none !important;
        }

        .entity-detail-topbar + .content .oc-head > div:first-child > .btn {
          flex: 0 0 auto;
        }

        .entity-detail-topbar + .content .oc-head > div:first-child > div:last-child {
          flex: 0 0 auto;
        }

        .entity-detail-topbar + .content .oc-head > div:first-child > div:last-child > span > .btn.btn-ghost.btn-icon {
          width: auto !important;
          min-width: 112px;
          height: 38px;
          padding: 0 14px !important;
          gap: 8px;
          border: 1px solid var(--blue) !important;
          border-radius: 10px;
          background: var(--blue) !important;
          color: #fff !important;
        }

        .entity-detail-topbar + .content .oc-head > div:first-child > div:last-child > span > .btn.btn-ghost.btn-icon::after {
          content: 'Действия';
          font-size: 14px;
          font-weight: 600;
          line-height: 1;
        }

        .entity-detail-topbar + .content .oc-head .oc-purpose {
          margin: 10px 2px 0 !important;
          padding: 0 2px;
          max-width: 100%;
          color: var(--muted);
          font-size: 13px;
          font-weight: 500;
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .entity-detail-topbar + .content .oc-workspace-nav {
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          margin: 18px 0 0 !important;
          padding: 0 0 2px !important;
          border: 0 !important;
          background: transparent !important;
          overflow-x: auto;
          overflow-y: hidden;
          scrollbar-width: thin;
        }

        .entity-detail-topbar + .content .oc-workspace-nav button {
          min-height: 42px !important;
          display: inline-flex !important;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex: 0 0 auto;
          padding: 0 17px !important;
          border: 1px solid var(--field-line) !important;
          border-radius: 12px !important;
          background: var(--surface) !important;
          color: var(--body) !important;
          font-size: 14.5px !important;
          font-weight: 600 !important;
          line-height: 1;
          white-space: nowrap;
        }

        .entity-detail-topbar + .content .oc-workspace-nav button:hover {
          background: var(--hover) !important;
        }

        .entity-detail-topbar + .content .oc-workspace-nav button > svg {
          display: none !important;
        }

        .entity-detail-topbar + .content .oc-workspace-nav button > b {
          min-width: 24px;
          height: 23px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 7px;
          border-radius: 999px;
          background: var(--gray-bg);
          color: var(--gray-text);
          font-size: 12.5px;
          font-weight: 600;
        }

        .entity-detail-topbar + .content .oc-workspace-nav button.active {
          border-color: var(--blue) !important;
          background: var(--blue) !important;
          color: #fff !important;
        }

        .entity-detail-topbar + .content .oc-workspace-nav button.active > b {
          background: rgba(255,255,255,.24);
          color: #fff;
        }

        @media (max-width: 900px) {
          .entity-detail-topbar + .content .oc-head > div:first-child {
            align-items: flex-start !important;
            padding: 18px 20px !important;
          }

          .entity-detail-topbar + .content .oc-head > div:first-child > .oc-id + div {
            order: 4;
            flex-basis: 100% !important;
            min-width: 0 !important;
          }
        }

        @media (max-width: 600px) {
          .entity-detail-topbar-nav {
            gap: 9px;
          }

          .entity-detail-topbar + .content .oc-head > div:first-child {
            min-height: 0 !important;
            padding: 15px !important;
            gap: 10px !important;
          }

          .entity-detail-topbar + .content .oc-head .oc-id {
            width: 100%;
            min-width: 0;
            justify-content: space-between;
          }

          .entity-detail-topbar + .content .oc-head .oc-id h2 {
            min-width: 0;
            font-size: 18px !important;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .entity-detail-topbar + .content .oc-head > div:first-child > .btn,
          .entity-detail-topbar + .content .oc-head > div:first-child > div:last-child {
            flex: 1 1 calc(50% - 5px);
          }

          .entity-detail-topbar + .content .oc-head > div:first-child > .btn,
          .entity-detail-topbar + .content .oc-head > div:first-child > div:last-child > span,
          .entity-detail-topbar + .content .oc-head > div:first-child > div:last-child > span > .btn {
            width: 100% !important;
          }

          .entity-detail-topbar + .content .oc-workspace-nav {
            gap: 8px !important;
          }

          .entity-detail-topbar + .content .oc-workspace-nav button {
            min-height: 40px !important;
            padding: 0 13px !important;
            font-size: 13.5px !important;
          }
        }
      `}</style>}
    </div>
  );
}

export { Topbar };
