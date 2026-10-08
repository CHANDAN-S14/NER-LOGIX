import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Crosshair,
  ImagePlus,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

import { useAppData } from '../../context/AppDataContext';

import LocationSearch from '../common/LocationSearch';
import Button from '../common/Button';
import Badge from '../common/Badge';
import StatusBanner from '../common/StatusBanner';
import Card, { CardHeader } from '../common/Card';

import useGeolocation from '../../hooks/useGeolocation';
import { reverseGeocode } from '../../services/geocode';
import { INCIDENT_SEVERITY } from '../../services/config';


const TYPES = [
  'Landslide',
  'Flood',
  'Road Damage',
  'Accident',
  'Blockage',
  'Weather Hazard',
  'Other',
];


const MAX_IMAGE_SIZE = 8 * 1024 * 1024;


function severityVariant(severity) {
  const value =
    String(severity || '').toUpperCase();

  if (
    value === 'BLOCKED' ||
    value === 'HIGH'
  ) {
    return 'danger';
  }

  if (value === 'MODERATE') {
    return 'warn';
  }

  return 'safe';
}


/*
 * Convert an image File into a compressed data URL.
 *
 * This keeps the existing JSON incident API.
 * The backend stores the resulting image string
 * in the existing Incident.image field.
 */
async function fileToDataUrl(file) {
  if (!file) {
    return null;
  }

  if (!file.type.startsWith('image/')) {
    throw new Error(
      'Please select an image file.'
    );
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(
      'Image is too large. Please choose an image below 8 MB.'
    );
  }

  const dataUrl =
    await new Promise((resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload = () =>
        resolve(reader.result);

      reader.onerror = () =>
        reject(
          new Error(
            'Unable to read image.'
          )
        );

      reader.readAsDataURL(file);
    });


  /*
   * Resize/compress before sending.
   * This prevents unnecessarily huge MongoDB documents.
   */
  const compressed =
    await compressImage(dataUrl);

  return compressed;
}


function compressImage(dataUrl) {
  return new Promise(
    (resolve, reject) => {
      const image =
        new Image();

      image.onload = () => {
        const maxWidth = 1280;
        const maxHeight = 1280;

        let width =
          image.naturalWidth;

        let height =
          image.naturalHeight;


        const scale =
          Math.min(
            1,
            maxWidth / width,
            maxHeight / height
          );


        width =
          Math.round(
            width * scale
          );

        height =
          Math.round(
            height * scale
          );


        const canvas =
          document.createElement(
            'canvas'
          );

        canvas.width = width;
        canvas.height = height;


        const context =
          canvas.getContext(
            '2d'
          );


        if (!context) {
          resolve(dataUrl);
          return;
        }


        context.drawImage(
          image,
          0,
          0,
          width,
          height
        );


        resolve(
          canvas.toDataURL(
            'image/jpeg',
            0.78
          )
        );
      };


      image.onerror = () =>
        reject(
          new Error(
            'Unable to process image.'
          )
        );


      image.src = dataUrl;
    }
  );
}


export default function IncidentPanel() {
  const {
    incidents,
    submitIncident,
    isBackendLive,
    activeLocation,
  } = useAppData();


  const {
    requestLocation,
    loading: gpsLoading,
  } = useGeolocation();


  const fileInputRef =
    useRef(null);

  const videoRef =
    useRef(null);

  const canvasRef =
    useRef(null);

  const streamRef =
    useRef(null);


  const [
    location,
    setLocation,
  ] = useState(null);


  const [
    type,
    setType,
  ] = useState(
    TYPES[0]
  );


  const [
    severity,
    setSeverity,
  ] = useState(
    INCIDENT_SEVERITY.MODERATE
  );


  const [
    description,
    setDescription,
  ] = useState('');


  const [
    submitting,
    setSubmitting,
  ] = useState(false);


  const [
    formError,
    setFormError,
  ] = useState(null);


  const [
    formSuccess,
    setFormSuccess,
  ] = useState(null);


  /*
   * Image state
   */
  const [
    imageFile,
    setImageFile,
  ] = useState(null);


  const [
    imagePreview,
    setImagePreview,
  ] = useState(null);


  const [
    cameraOpen,
    setCameraOpen,
  ] = useState(false);


  const [
    cameraLoading,
    setCameraLoading,
  ] = useState(false);


  /* ==========================================================
     STOP CAMERA
     ========================================================== */

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      streamRef.current = null;
    }


    if (videoRef.current) {
      videoRef.current.srcObject =
        null;
    }


    setCameraOpen(false);
    setCameraLoading(false);
  };


  /* ==========================================================
     START CAMERA
     ========================================================== */

  const openCamera = async () => {
    setFormError(null);

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setFormError(
        'Camera is not supported by this browser.'
      );

      return;
    }


    try {
      setCameraLoading(true);
      setCameraOpen(true);


      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            video: {
              facingMode: {
                ideal: 'environment',
              },
            },
            audio: false,
          }
        );


      streamRef.current =
        stream;


      if (videoRef.current) {
        videoRef.current.srcObject =
          stream;

        await videoRef.current.play();
      }
    } catch (error) {
      console.error(
        'Camera error:',
        error
      );

      setCameraOpen(false);

      setFormError(
        error?.name ===
          'NotAllowedError'
          ? 'Camera permission was denied. Please allow camera access and try again.'
          : 'Unable to open camera.'
      );
    } finally {
      setCameraLoading(false);
    }
  };


  /* ==========================================================
     CAPTURE CAMERA IMAGE
     ========================================================== */

  const captureImage = async () => {
    const video =
      videoRef.current;

    const canvas =
      canvasRef.current;


    if (!video || !canvas) {
      return;
    }


    const width =
      video.videoWidth || 1280;

    const height =
      video.videoHeight || 720;


    const maxWidth = 1280;
    const maxHeight = 1280;


    const scale =
      Math.min(
        1,
        maxWidth / width,
        maxHeight / height
      );


    canvas.width =
      Math.round(width * scale);

    canvas.height =
      Math.round(height * scale);


    const context =
      canvas.getContext('2d');


    if (!context) {
      setFormError(
        'Unable to capture image.'
      );

      return;
    }


    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );


    const dataUrl =
      canvas.toDataURL(
        'image/jpeg',
        0.78
      );


    setImagePreview(dataUrl);

    /*
     * Convert captured image into a File
     * so the UI treats camera and upload
     * consistently.
     */
    try {
      const response =
        await fetch(dataUrl);

      const blob =
        await response.blob();

      const file =
        new File(
          [blob],
          `incident-${Date.now()}.jpg`,
          {
            type: 'image/jpeg',
          }
        );

      setImageFile(file);
    } catch {
      setImageFile(null);
    }


    stopCamera();
  };


  /* ==========================================================
     FILE UPLOAD
     ========================================================== */

  const handleFileChange = async (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }


    setFormError(null);
    setFormSuccess(null);


    try {
      const preview =
        await fileToDataUrl(file);

      setImageFile(file);
      setImagePreview(preview);

      setFormSuccess(
        'Image attached successfully.'
      );
    } catch (error) {
      setImageFile(null);
      setImagePreview(null);

      setFormError(
        error?.message ||
          'Unable to attach image.'
      );
    }


    /*
     * Allow selecting the same file again.
     */
    event.target.value = '';
  };


  /* ==========================================================
     REMOVE IMAGE
     ========================================================== */

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormSuccess(null);
  };


  /* ==========================================================
     GPS
     ========================================================== */

  const useGps = async () => {
    try {
      setFormError(null);

      const pos =
        await requestLocation();


      let label =
        `${pos.lat.toFixed(4)}, ${pos.lon.toFixed(4)}`;


      try {
        const reverse =
          await reverseGeocode(
            pos.lat,
            pos.lon
          );

        if (reverse?.label) {
          label =
            reverse.label;
        }
      } catch {
        /*
         * Keep coordinates if
         * reverse geocoding fails.
         */
      }


      setLocation({
        lat: pos.lat,
        lon: pos.lon,
        label,
        source: 'gps',
      });
    } catch (error) {
      setFormError(
        error?.message ||
          'Unable to get your location.'
      );
    }
  };


  /* ==========================================================
     SUBMIT INCIDENT
     ========================================================== */

  const onSubmit = async (event) => {
    event.preventDefault();

    setFormError(null);
    setFormSuccess(null);


    if (!isBackendLive) {
      setFormError(
        'Backend offline — cannot submit incident.'
      );

      return;
    }


    const loc =
      location ||
      activeLocation;


    if (
      loc?.lat == null ||
      loc?.lon == null
    ) {
      setFormError(
        'Select a location or use current GPS.'
      );

      return;
    }


    if (!description.trim()) {
      setFormError(
        'Please describe the incident.'
      );

      return;
    }


    setSubmitting(true);


    try {
      /*
       * imagePreview is already a compressed
       * data URL.
       *
       * The existing backend accepts:
       * image
       */
      await submitIncident({
        type,

        severity,

        description:
          description.trim(),

        lat:
          Number(loc.lat),

        lon:
          Number(loc.lon),

        locationLabel:
          loc.label,

        timestamp:
          new Date().toISOString(),

        image:
          imagePreview || '',
      });


      setFormSuccess(
        'Incident submitted successfully. The image was attached.'
      );


      /*
       * Clear only the form fields.
       *
       * AppDataContext + Socket.IO will
       * update the incident list/map.
       */

      setDescription('');

      setImageFile(null);
      setImagePreview(null);

      setLocation(null);

    } catch (error) {
      console.error(
        'Incident submission failed:',
        error
      );

      setFormError(
        error?.message ||
          'Failed to submit incident.'
      );
    } finally {
      setSubmitting(false);
    }
  };


  /* ==========================================================
     CLEANUP CAMERA
     ========================================================== */

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach(
            (track) =>
              track.stop()
          );
      }
    };
  }, []);


  /* ==========================================================
     INCIDENT LIST
     ========================================================== */

  const list =
    incidents.status === 'success' &&
    Array.isArray(
      incidents.data
    )
      ? incidents.data
      : [];


  return (
    <section className="animate-fade-in space-y-4">

      {/* ======================================================
          REPORT INCIDENT
      ====================================================== */}

      <Card>

        <CardHeader
          title="Report Incident"
          action={
            <AlertTriangle className="h-4 w-4 text-warn" />
          }
        />


        <form
          onSubmit={onSubmit}
          className="space-y-3"
        >

          {/* ==================================================
              LOCATION
          ================================================== */}

          <LocationSearch
            value={
              location?.label || ''
            }
            placeholder="Search incident location"
            onSelect={(selected) =>
              setLocation({
                lat: selected.lat,
                lon: selected.lon,
                label: selected.label,
                source: 'manual',
              })
            }
            onClear={() =>
              setLocation(null)
            }
          />


          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={gpsLoading}
            onClick={useGps}
            className="w-full"
          >
            <Crosshair className="h-3.5 w-3.5" />

            Use Current GPS
          </Button>


          {/* ==================================================
              PHOTO SECTION
          ================================================== */}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">

            <div className="mb-2 flex items-center justify-between">

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  Incident Photo
                </p>

                <p className="mt-0.5 text-[10px] text-slate-400">
                  Add visual proof of the incident
                </p>
              </div>

              {imagePreview && (
                <Badge variant="safe">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Image attached
                </Badge>
              )}

            </div>


            {/* ==================================================
                CAMERA PREVIEW
            ================================================== */}

            {cameraOpen && (
              <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-black">

                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="aspect-video w-full object-cover"
                />

                <div className="flex gap-2 bg-slate-900 p-2">

                  <Button
                    type="button"
                    size="sm"
                    className="flex-1"
                    loading={cameraLoading}
                    onClick={captureImage}
                  >
                    <Camera className="h-4 w-4" />
                    Capture
                  </Button>


                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={stopCamera}
                  >
                    <X className="h-4 w-4" />
                    Close
                  </Button>

                </div>

              </div>
            )}


            {/* ==================================================
                IMAGE PREVIEW
            ================================================== */}

            {imagePreview && !cameraOpen && (
              <div className="relative mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white">

                <img
                  src={imagePreview}
                  alt="Incident preview"
                  className="max-h-64 w-full object-cover"
                />


                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute right-2 top-2 rounded-full bg-white/95 p-2 text-red-600 shadow-md transition hover:bg-white"
                  aria-label="Remove image"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

              </div>
            )}


            {/* ==================================================
                CAMERA + UPLOAD BUTTONS
            ================================================== */}

            {!cameraOpen && (
              <div className="grid grid-cols-2 gap-2">

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={openCamera}
                >
                  <Camera className="h-4 w-4" />
                  Camera
                </Button>


                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                >
                  <Upload className="h-4 w-4" />
                  Upload Image
                </Button>

              </div>
            )}


            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />


            <canvas
              ref={canvasRef}
              className="hidden"
            />

          </div>


          {/* ==================================================
              TYPE
          ================================================== */}

          <div>

            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Type
            </label>


            <select
              value={type}
              onChange={(event) =>
                setType(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            >

              {TYPES.map(
                (incidentType) => (
                  <option
                    key={incidentType}
                    value={incidentType}
                  >
                    {incidentType}
                  </option>
                )
              )}

            </select>

          </div>


          {/* ==================================================
              SEVERITY
          ================================================== */}

          <div>

            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Severity
            </label>


            <div className="grid grid-cols-4 gap-1.5">

              {Object.values(
                INCIDENT_SEVERITY
              ).map(
                (severityValue) => (
                  <button
                    key={
                      severityValue
                    }
                    type="button"
                    onClick={() =>
                      setSeverity(
                        severityValue
                      )
                    }
                    className={`rounded-lg border px-1 py-2 text-[10px] font-bold ${
                      severity ===
                      severityValue
                        ? severityVariant(
                            severityValue
                          ) === 'danger'
                          ? 'border-red-300 bg-danger-soft text-danger'
                          : severityVariant(
                                severityValue
                              ) === 'warn'
                            ? 'border-amber-300 bg-warn-soft text-warn'
                            : 'border-emerald-300 bg-safe-soft text-safe'
                        : 'border-slate-200 bg-white text-slate-500'
                    }`}
                  >
                    {severityValue}
                  </button>
                )
              )}

            </div>

          </div>


          {/* ==================================================
              DESCRIPTION
          ================================================== */}

          <div>

            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Description
            </label>


            <textarea
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              rows={3}
              placeholder="Describe the incident…"
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />

          </div>


          {/* ==================================================
              STATUS
          ================================================== */}

          {formError && (
            <p className="text-xs text-danger">
              {formError}
            </p>
          )}


          {formSuccess && (
            <p className="flex items-center gap-1 text-xs text-safe">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {formSuccess}
            </p>
          )}


          {/* ==================================================
              SUBMIT
          ================================================== */}

          <Button
            type="submit"
            className="w-full"
            loading={submitting}
          >
            Submit Incident
          </Button>

        </form>

      </Card>


      {/* ======================================================
          ACTIVE INCIDENTS
      ====================================================== */}

      <Card>

        <CardHeader
          title="Active Incidents"
        />


        {incidents.status ===
          'loading' && (
          <StatusBanner
            type="loading"
            title="Loading incidents…"
          />
        )}


        {incidents.status ===
          'error' && (
          <StatusBanner
            type="error"
            title="Unable to load incidents"
            message={
              incidents.error
            }
          />
        )}


        {incidents.status ===
          'success' &&
          list.length === 0 && (
            <StatusBanner
              type="empty"
              title="No incidents reported"
            />
          )}


        {list.length > 0 && (
          <ul className="max-h-64 space-y-2 overflow-auto ner-scroll">

            {list.map(
              (incident) => (
                <li
                  key={
                    incident.id ||
                    incident._id
                  }
                  className="rounded-xl border border-slate-100 px-3 py-2.5"
                >

                  <div className="flex items-start justify-between gap-2">

                    <p className="text-sm font-semibold text-slate-900">
                      {incident.type ||
                        'Incident'}
                    </p>


                    <Badge
                      variant={severityVariant(
                        incident.severity
                      )}
                    >
                      {(
                        incident.severity ||
                        'MODERATE'
                      ).toUpperCase()}
                    </Badge>

                  </div>


                  {incident.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {incident.description}
                    </p>
                  )}


                  {incident.image && (
                    <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                      <ImagePlus className="h-3 w-3" />
                      Photo attached
                    </div>
                  )}

                </li>
              )
            )}

          </ul>
        )}

      </Card>

    </section>
  );
}