import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FiLoader, FiAlertCircle, FiUpload, FiX, FiFile, FiRefreshCw } from "react-icons/fi";
import MediaCard from "../components/ui/MediaCard";
import { getGallery, uploadMediaFile, getMyMedia, resubmitMedia } from "../services/api/mediaApi";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { ApiError } from "../services/api/client";
import { SkeletonMediaGrid, SkeletonList } from "../components/ui/Skeleton";
import { useToast } from "../components/toast/ToastProvider";
import { useAuth } from "../features/auth/context/AuthContext";

const ACCEPT_MEDIA = "image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime";
const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_MIMES = ["video/mp4", "video/webm", "video/quicktime"];
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
const VIDEO_EXTENSIONS = ["mp4", "webm", "mov"];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB

function validateMediaFile(file) {
  if (!file) return { ok: false, message: "Please select a file." };
  const mime = (file.type || "").toLowerCase();
  const ext = (file.name.split(".").pop() || "").toLowerCase();

  const isImage = IMAGE_MIMES.includes(mime) && IMAGE_EXTENSIONS.includes(ext);
  const isVideo = VIDEO_MIMES.includes(mime) && VIDEO_EXTENSIONS.includes(ext);

  if (!isImage && !isVideo) {
    return { ok: false, message: "Unsupported file type. Upload a photo (JPG, PNG, WEBP) or video (MP4, WEBM, MOV)." };
  }

  const limit = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (file.size > limit) {
    return { ok: false, message: `File is too large. Maximum allowed is ${Math.round(limit / 1024 / 1024)} MB.` };
  }

  return { ok: true, kind: isVideo ? "video" : "image" };
}

export default function GalleryPage({ reelOnly = false }) {
  const toast = useToast();
  const { isAuthenticated, membership } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef(null);

  const guildUid = searchParams.get("guildUid") ?? "";
  const playerUid = searchParams.get("playerUid") ?? "";

  const [media, setMedia] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploadCategory, setUploadCategory] = useState("guild");
  const [uploadVisibility, setUploadVisibility] = useState("public");
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);

  const [rejectedMedia, setRejectedMedia] = useState([]);
  const [rejectedLoading, setRejectedLoading] = useState(false);
  const [resubmittingId, setResubmittingId] = useState(null);

  const loadRejected = async () => {
    setRejectedLoading(true);
    try {
      const mine = await getMyMedia();
      setRejectedMedia(Array.isArray(mine) ? mine.filter((m) => m.approvalStatus === "rejected") : []);
    } catch {
      setRejectedMedia([]);
    } finally {
      setRejectedLoading(false);
    }
  };

  const handleResubmit = async (media) => {
    setResubmittingId(media._id);
    try {
      await toast.promise(resubmitMedia(media._id), {
        loading: "Resubmitting…",
        success: "Media resubmitted",
        successDescription: "Guild admins will review it again.",
        error: (err) => (err instanceof ApiError ? err.message : "Could not resubmit."),
      });
      setRejectedMedia((prev) => prev.filter((m) => m._id !== media._id));
    } catch {
      // toast handled it
    } finally {
      setResubmittingId(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    const params = {
      guildUid: guildUid || undefined,
      playerUid: playerUid || undefined,
      type: reelOnly ? "video" : undefined,
    };
    getGallery(params)
      .then((d) => !cancelled && setMedia(Array.isArray(d) ? d : []))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : "Could not load gallery."))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [guildUid, playerUid, reelOnly, refreshKey]);

  // Revoke old object URLs so we don't leak memory across file selections.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileSelect = (e) => {
    setUploadError("");
    const file = e.target.files?.[0] || null;
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl("");
      return;
    }

    const result = validateMediaFile(file);
    if (!result.ok) {
      setSelectedFile(null);
      setPreviewUrl("");
      setUploadError(result.message);
      return;
    }

    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl("");
    setUploadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const closeUpload = () => {
    setShowUpload(false);
    setUploadError("");
    setTimeout(handleRemoveFile, 0);
  };

  const openUpload = () => {
    setShowUpload(true);
    loadRejected();
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError("Please choose a photo or video from your device.");
      return;
    }
    setUploadError("");
    setUploading(true);
    try {
      await toast.promise(
        uploadMediaFile(selectedFile, {
          category: membership ? uploadCategory : "personal",
          visibility: uploadVisibility,
        }),
        {
          loading: "Uploading…",
          success: "Media uploaded",
          successDescription: membership ? "Awaiting admin approval." : undefined,
          error: (err) => (err instanceof ApiError ? err.message : "Upload failed."),
        }
      );
      closeUpload();
      setRefreshKey((k) => k + 1);
    } catch {
      // toast handled it
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 animate-fade-up">
        <div>
          <h1 className="text-2xl font-display text-cream">{reelOnly ? "Reels" : "Gallery"}</h1>
          <p className="text-sm text-guild-400 mt-1">
            {reelOnly ? "Videos from guilds around the community." : "Photos and videos, searchable by Guild UID or Player UID."}
          </p>
        </div>
        {isAuthenticated && (
          <button
            onClick={openUpload}
            className="flex items-center gap-2 rounded-full gold-gradient-bg px-4 py-2 text-xs font-bold text-guild-950 gold-glow hover:brightness-110"
          >
            <FiUpload /> Upload media
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={guildUid}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            const next = new URLSearchParams(searchParams);
            if (v) next.set("guildUid", v);
            else next.delete("guildUid");
            setSearchParams(next, { replace: true });
          }}
          placeholder="Filter by Guild UID"
          inputMode="numeric"
          className="rounded-full input-dark px-4 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500"
        />
        <input
          value={playerUid}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            const next = new URLSearchParams(searchParams);
            if (v) next.set("playerUid", v);
            else next.delete("playerUid");
            setSearchParams(next, { replace: true });
          }}
          placeholder="Filter by Player UID"
          inputMode="numeric"
          className="rounded-full input-dark px-4 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500"
        />
      </div>

      {isLoading ? (
        <SkeletonMediaGrid count={9} />
      ) : error ? (
        <div className="py-16 text-center">
          <FiAlertCircle className="mx-auto text-3xl text-gold-400" />
          <p className="mt-3 text-sm font-semibold text-cream">{error}</p>
        </div>
      ) : media.length === 0 ? (
        <div className="py-16 text-center text-sm text-guild-500">
          {showUpload ? "" : "No media found. Uploaded media must be approved by guild admins to appear here."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {media.map((m) => (
            <MediaCard key={m._id} media={m} onChanged={() => setRefreshKey((k) => k + 1)} />
          ))}
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={closeUpload}>
          <form
            onSubmit={handleUpload}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-guild-700 bg-guild-900 p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-lg font-display text-cream">Upload media</h3>

            {!selectedFile ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-guild-600 bg-guild-950 px-4 py-10 text-center hover:border-gold-500/60 hover:bg-guild-850 transition-colors ${reelOnly ? "cursor-pointer" : ""}`}
              >
                <FiUpload className="text-2xl text-gold-400" />
                <span className="text-sm font-bold text-cream">Upload Photo or Video</span>
                <span className="text-[11px] text-guild-500">JPG, PNG, WEBP · MP4, WEBM, MOV (up to 50 MB)</span>
              </button>
            ) : (
              <div className="rounded-xl border border-guild-700 bg-black overflow-hidden">
                {previewUrl && selectedFile?.type.startsWith("video/") ? (
                  <video src={previewUrl} controls className="w-full max-h-64 object-contain" />
                ) : previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-full max-h-64 object-contain" />
                ) : null}
                <div className="flex items-center justify-between gap-3 bg-guild-900 px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FiFile className="text-gold-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-cream truncate">{selectedFile?.name}</p>
                      <p className="text-[11px] text-guild-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="flex items-center gap-1 rounded-full border border-guild-600 px-3 py-1.5 text-xs font-semibold text-guild-300 hover:bg-guild-800"
                  >
                    <FiX /> Change
                  </button>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_MEDIA}
              onChange={handleFileSelect}
              className="hidden"
            />

            {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}

            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-guild-300">
                Visibility
                <select
                  value={uploadVisibility}
                  onChange={(e) => setUploadVisibility(e.target.value)}
                  className="mt-1 w-full input-dark rounded-lg px-3 py-2 text-sm"
                >
                  <option value="public">Public</option>
                  <option value="private">Guild members only</option>
                </select>
              </label>
            </div>

            {membership && (
              <div>
                <label className="text-xs font-semibold text-guild-300">Category (you're in a guild)</label>
                <div className="mt-1 grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 rounded-lg border border-guild-600 px-3 py-2 text-xs text-guild-200">
                    <input
                      type="radio"
                      name="category"
                      checked={uploadCategory === "guild"}
                      onChange={() => setUploadCategory("guild")}
                    />
                    Guild — stays with the guild
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-guild-600 px-3 py-2 text-xs text-guild-200">
                    <input
                      type="radio"
                      name="category"
                      checked={uploadCategory === "personal"}
                      onChange={() => setUploadCategory("personal")}
                    />
                    Personal — stays on your profile
                  </label>
                </div>
              </div>
            )}

            {membership && (
              <p className="text-[11px] text-guild-500">
                While you're an active member, all uploads are reviewed by guild admins before publishing.
              </p>
            )}

            {rejectedMedia.length > 0 && (
              <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-4 space-y-3">
                <p className="text-xs font-bold text-red-300">Rejected uploads — fix and resubmit</p>
                <ul className="space-y-2">
                  {rejectedMedia.map((m) => (
                    <li key={m._id} className="flex items-center gap-3">
                      {m.type === "video" ? (
                        <video src={resolveMediaUrl(m.url)} className="h-10 w-14 rounded bg-guild-950 object-contain" muted />
                      ) : (
                        <img src={resolveMediaUrl(m.url)} alt="" className="h-10 w-14 rounded bg-guild-950 object-contain" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-cream truncate">{m.url.split("/").pop()}</p>
                        <p className="text-[10px] text-guild-500 capitalize">
                          {m.type} · {m.category} · rejected {new Date(m.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleResubmit(m)}
                        disabled={resubmittingId === m._id}
                        className="flex items-center gap-1.5 rounded-lg border border-gold-500/50 px-3 py-1.5 text-[11px] font-bold text-gold-300 hover:bg-gold-500/10 disabled:opacity-50 shrink-0"
                      >
                        {resubmittingId === m._id ? <FiLoader className="animate-spin" /> : <FiRefreshCw />} Resubmit
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {rejectedLoading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[11px] text-guild-500">
                  <FiLoader className="animate-spin" /> Checking your uploads…
                </div>
                <SkeletonList count={3} />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={closeUpload}
                disabled={uploading}
                className="flex-1 rounded-lg bg-guild-700 py-2 text-sm font-semibold text-guild-100 hover:bg-guild-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="flex-1 rounded-lg gold-gradient-bg py-2 text-sm font-bold text-guild-950 hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {uploading && <FiLoader className="animate-spin" />}
                {uploading ? "Uploading…" : "Upload"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}