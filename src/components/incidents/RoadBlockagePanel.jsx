import { useMemo } from 'react';

import {
  ExternalLink,
  MapPin,
  AlertTriangle,
  Languages,
} from 'lucide-react';

import { useAppData } from '../../context/AppDataContext';

import Badge from '../common/Badge';
import StatusBanner from '../common/StatusBanner';
import Card, {
  CardHeader,
} from '../common/Card';

/* ==========================================================
   HELPERS
========================================================== */

function getAlertKey(
  alert,
  index
) {
  return (
    alert?.sourceAlertId ||
    alert?.id ||
    alert?._id ||
    `alert-${index}`
  );
}

function getAlertTitle(
  alert
) {
  return (
    alert?.englishTitle ||
    alert?.title ||
    alert?.headline ||
    alert?.type ||
    alert?.event ||
    'SACHET Hazard Alert'
  );
}

function getAlertDescription(
  alert
) {
  return (
    alert?.englishDescription ||
    alert?.description ||
    alert?.instruction ||
    ''
  );
}

function getAlertArea(
  alert
) {
  return (
    alert?.englishArea ||
    alert?.area ||
    alert?.areaDescription ||
    alert?.state ||
    ''
  );
}

function getAlertUrgency(
  alert
) {
  return (
    alert?.englishUrgency ||
    alert?.urgency ||
    ''
  );
}

function getAlertSeverity(
  alert
) {
  return (
    alert?.englishSeverity ||
    alert?.severity ||
    ''
  );
}

function getSeverityVariant(
  severity
) {
  const value =
    String(
      severity || ''
    ).toLowerCase();

  if (
    value.includes(
      'extreme'
    ) ||
    value.includes(
      'severe'
    ) ||
    value.includes(
      'high'
    )
  ) {
    return 'danger';
  }

  if (
    value.includes(
      'moderate'
    ) ||
    value.includes(
      'medium'
    )
  ) {
    return 'warn';
  }

  return 'neutral';
}

function isExpired(
  alert
) {
  if (!alert?.expires) {
    return false;
  }

  const expiresAt =
    Date.parse(
      alert.expires
    );

  if (
    !Number.isFinite(
      expiresAt
    )
  ) {
    return false;
  }

  return (
    expiresAt <= Date.now()
  );
}

/* ==========================================================
   COMPONENT
========================================================== */

export default function RoadBlockagePanel() {
  const {
    blockages,
    alerts,
    isBackendLive,
  } = useAppData();

  /* ========================================================
     CONFIRMED ROAD BLOCKAGES
  ======================================================== */

  const confirmedBlockages =
    useMemo(() => {
      if (
        blockages.status !==
          'success' ||
        !Array.isArray(
          blockages.data
        )
      ) {
        return [];
      }

      return blockages.data;
    }, [blockages]);

  /* ========================================================
     SACHET / NDMA HAZARDS
  ======================================================== */

  const sachetHazards =
    useMemo(() => {
      if (
        alerts.status !==
          'success' ||
        !Array.isArray(
          alerts.data
        )
      ) {
        return [];
      }

      const unique =
        new Map();

      for (
        let index = 0;
        index < alerts.data.length;
        index++
      ) {
        const alert =
          alerts.data[index];

        if (!alert) {
          continue;
        }

        /*
         * Remove expired alerts.
         */
        if (
          isExpired(alert)
        ) {
          continue;
        }

        const key =
          getAlertKey(
            alert,
            index
          );

        if (
          !unique.has(key)
        ) {
          unique.set(
            key,
            alert
          );
        }
      }

      return [
        ...unique.values(),
      ];
    }, [alerts]);

  /* ========================================================
     RENDER
  ======================================================== */

  return (
    <section className="animate-fade-in space-y-4">

      {/* =====================================================
          CONFIRMED ROAD BLOCKAGES
      ===================================================== */}

      <Card>
        <CardHeader
          title="Confirmed Road Blockages"
          action={
            <Badge variant="danger">
              CONFIRMED
            </Badge>
          }
        />

        {blockages.status ===
          'loading' && (
          <StatusBanner
            type="loading"
            title="Loading confirmed blockages…"
          />
        )}

        {blockages.status ===
          'error' && (
          <StatusBanner
            type={
              isBackendLive
                ? 'error'
                : 'offline'
            }
            title="Unable to load blockages"
            message={
              blockages.error
            }
          />
        )}

        {blockages.status ===
          'success' &&
          confirmedBlockages.length ===
            0 && (
            <StatusBanner
              type="empty"
              title="No confirmed blocked roads"
              message="No road has been marked as blocked by the road-status source."
            />
          )}

        {confirmedBlockages.length >
          0 && (
          <ul className="space-y-2">
            {confirmedBlockages.map(
              (
                road,
                index
              ) => (
                <li
                  key={
                    road.id ||
                    road._id ||
                    `blocked-${index}`
                  }
                  className="rounded-xl border border-red-100 bg-danger-soft/40 px-3 py-3"
                >
                  <div className="flex items-start gap-3">

                    <div className="mt-0.5 rounded-lg bg-red-100 p-2 text-red-600">
                      <AlertTriangle
                        size={16}
                      />
                    </div>

                    <div className="min-w-0 flex-1">

                      <p className="text-sm font-semibold text-slate-900">
                        {road.name ||
                          road.roadName ||
                          'Blocked road'}
                      </p>

                      {road.description && (
                        <p className="mt-1 text-xs text-slate-600">
                          {
                            road.description
                          }
                        </p>
                      )}

                      {road.blockageReason && (
                        <p className="mt-1 text-xs text-red-700">
                          Reason:{' '}
                          {
                            road.blockageReason
                          }
                        </p>
                      )}

                      {road.lastUpdated && (
                        <p className="mt-1 text-[10px] text-slate-400">
                          Updated:{' '}
                          {new Date(
                            road.lastUpdated
                          ).toLocaleString()}
                        </p>
                      )}

                    </div>
                  </div>
                </li>
              )
            )}
          </ul>
        )}
      </Card>

      {/* =====================================================
          SACHET / NDMA
      ===================================================== */}

      <Card>
        <CardHeader
          title={`SACHET Road Hazards${sachetHazards.length > 0 ? ` (${sachetHazards.length})` : ''}`}
          action={
            <Badge variant="warn">
              LIVE • SACHET / NDMA
            </Badge>
          }
        />

        {/* English translation notice */}

        <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5">

          <div className="flex items-start gap-2">

            <Languages
              size={16}
              className="mt-0.5 shrink-0 text-blue-600"
            />

            <p className="text-[11px] leading-relaxed text-blue-800">
              Live government alerts are
              automatically displayed in
              English for NER-LOGIX.
            </p>

          </div>

        </div>

        {/* Important source notice */}

        <div className="mb-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5">

          <div className="flex gap-2">

            <AlertTriangle
              size={16}
              className="mt-0.5 shrink-0 text-amber-600"
            />

            <p className="text-[11px] leading-relaxed text-amber-800">
              These are live disaster and
              hazard alerts from SACHET /
              NDMA. They indicate potential
              impact on accessibility and are
              <strong>
                {' '}
                not automatically confirmed
                road blockages.
              </strong>
            </p>

          </div>

        </div>

        {/* Loading */}

        {alerts.status ===
          'loading' && (
          <StatusBanner
            type="loading"
            title="Fetching SACHET alerts…"
            message="Connecting to the SACHET / NDMA feed."
          />
        )}

        {/* Error */}

        {alerts.status ===
          'error' && (
          <StatusBanner
            type="offline"
            title="SACHET unavailable"
            message={
              alerts.error ||
              'Unable to retrieve the SACHET / NDMA feed.'
            }
          />
        )}

        {/* Empty */}

        {alerts.status ===
          'success' &&
          sachetHazards.length ===
            0 && (
            <StatusBanner
              type="empty"
              title="No active SACHET hazards"
              message="No active SACHET alerts are currently available."
            />
          )}

        {/* Alerts */}

        {sachetHazards.length >
          0 && (
          <ul className="space-y-2">

            {sachetHazards.map(
              (
                alert,
                index
              ) => {
                const title =
                  getAlertTitle(
                    alert
                  );

                const description =
                  getAlertDescription(
                    alert
                  );

                const area =
                  getAlertArea(
                    alert
                  );

                const urgency =
                  getAlertUrgency(
                    alert
                  );

                const severity =
                  getAlertSeverity(
                    alert
                  );

                return (
                  <li
                    key={getAlertKey(
                      alert,
                      index
                    )}
                    className="rounded-xl border border-amber-200 bg-warn-soft/40 px-3 py-3"
                  >

                    <div className="flex items-start gap-3">

                      {/* Icon */}

                      <div className="mt-0.5 rounded-lg bg-amber-100 p-2 text-amber-700">

                        <AlertTriangle
                          size={16}
                        />

                      </div>

                      {/* Content */}

                      <div className="min-w-0 flex-1">

                        {/* Title + severity */}

                        <div className="flex flex-wrap items-start justify-between gap-2">

                          <p className="text-sm font-semibold text-slate-900">
                            {title}
                          </p>

                          {severity && (
                            <Badge
                              variant={getSeverityVariant(
                                severity
                              )}
                            >
                              {String(
                                severity
                              ).toUpperCase()}
                            </Badge>
                          )}

                        </div>

                        {/* Original SACHET title if translated */}
                        {alert.originalTitle && alert.originalTitle !== title && (
                          <p className="mt-0.5 text-[11px] text-slate-400 italic">
                            Original: {alert.originalTitle}
                          </p>
                        )}

                        {/* Location */}

                        {area && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">

                            <MapPin
                              size={12}
                            />

                            <span>
                              {area}
                            </span>

                          </div>
                        )}

                        {/* English description */}

                        {description && (
                          <p className="mt-2 text-xs leading-relaxed text-slate-600">
                            {
                              description
                            }
                          </p>
                        )}

                        {/* Metadata */}

                        <div className="mt-2 flex flex-wrap items-center gap-2">

                          {alert.state && (
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                              {alert.state}
                            </span>
                          )}

                          {urgency && (
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                              {urgency}
                            </span>
                          )}

                          {alert.effective && (
                            <span className="text-[10px] text-slate-400">
                              {new Date(
                                alert.effective
                              ).toLocaleString()}
                            </span>
                          )}

                        </div>

                        {/* Live translation indicator */}

                        {(alert.translatedToEnglish || alert.language === 'en') && (
                          <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-blue-600">

                            <Languages
                              size={11}
                            />

                            English translation

                          </div>
                        )}

                        {/* Official source */}

                        {(alert.officialUrl || alert.link || alert.url) && (
                          <a
                            href={
                              alert.officialUrl || alert.link || alert.url
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
                          >
                            View official alert

                            <ExternalLink
                              size={12}
                            />

                          </a>
                        )}

                      </div>
                    </div>
                  </li>
                );
              }
            )}

          </ul>
        )}

      </Card>

    </section>
  );
}