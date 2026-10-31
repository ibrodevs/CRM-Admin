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













        .entity-detail-topbar + .content .oc-workspace-nav {
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          margin: 14px 0 0 !important;
          padding: 0 0 2px !important;
          border: 0 !important;
          background: transparent !important;
          overflow-x: auto;
          overflow-y: hidden;
          scrollbar-width: thin;
        }

        .entity-detail-topbar + .content .oc-workspace-nav button {
          min-height: 40px !important;
          display: inline-flex !important;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex: 0 0 auto;
          padding: 0 16px !important;
          border: 1px solid var(--field-line) !important;
          border-radius: 12px !important;
          background: var(--surface) !important;
          color: var(--body) !important;
          font-size: 14px !important;
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
          min-width: 22px;
          height: 21px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 6px;
          border-radius: 999px;
          background: var(--gray-bg);
          color: var(--gray-text);
          font-size: 12px;
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


        @media (max-width: 600px) {
          .entity-detail-topbar-nav {
            gap: 9px;
          }






          .entity-detail-topbar + .content .oc-workspace-nav {
            gap: 8px !important;
          }

          .entity-detail-topbar + .content .oc-workspace-nav button {
            min-height: 38px !important;
            padding: 0 13px !important;
            font-size: 13.5px !important;
          }
        }
      `}</style>}
    </div>
  );
}

export { Topbar };
