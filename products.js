import { db } from './firebase-config.js';
import { collection, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
// Cloudinary Config
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/doissrwhj/image/upload";
const CLOUDINARY_PRESET = "marino_preset";

// Helper: upload a File object OR an external URL to Cloudinary.
// Returns the secure Cloudinary URL, or the original URL as fallback if it fails.
async function uploadToCloudinary(fileOrUrl, labelForStatus) {
    const formData = new FormData();
    formData.append('upload_preset', CLOUDINARY_PRESET);
    if (fileOrUrl instanceof File) {
        formData.append('file', fileOrUrl);
    } else {
        // External URL: Cloudinary fetches and re-hosts it
        const url = fileOrUrl.trim();
        if (!url || !url.startsWith('http')) return url; // not a real URL, return as-is
        // If it's already a Cloudinary URL, no need to re-upload
        if (url.includes('res.cloudinary.com/doissrwhj')) return url;
        formData.append('file', url);
    }
    try {
        const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        return data.secure_url;
    } catch (e) {
        console.warn(`No se pudo subir a Cloudinary (${labelForStatus}):`, e.message);
        // Fallback: return whatever was passed (File → null, URL → original URL)
        return (fileOrUrl instanceof File) ? null : fileOrUrl.trim();
    }
}

// Smart variant splitter: splits by comma but ignores commas inside parentheses.
// e.g. "Fijación 6 (S/Tope, c/Tope), Fijación 8" → ["Fijación 6 (S/Tope, c/Tope)", "Fijación 8"]
function splitVariants(str) {
    const result = [];
    let depth = 0;
    let current = '';
    for (const ch of str) {
        if (ch === '(') { depth++; current += ch; }
        else if (ch === ')') { depth--; current += ch; }
        else if (ch === ',' && depth === 0) {
            const trimmed = current.trim();
            if (trimmed) result.push(trimmed);
            current = '';
        } else {
            current += ch;
        }
    }
    const trimmed = current.trim();
    if (trimmed) result.push(trimmed);
    return result;
}

// Product Data Management
const ITEMS_PER_PAGE = 24;
let productsData = [];
let currentPage = 1;
let currentSearch = '';

// Filter States
let selectedCategories = new Set();
let selectedProviders = new Set();
let selectedColors = new Set();

// Quantity state per product card (module-level so it persists across renders)
const cardQtyMap = new Map();

// Check if admin to show controls
const isAdminUser = localStorage.getItem('isAdmin') === 'true';

// Basic initial data (Official Mariño Catalog extracted from images)
const defaultProducts = [
    // DURLOCK - Placas de Yeso
    { id: "dur_placa_std", name: "Placa Estándar - STD", desc: "Placa de yeso para cielorrasos y revestimientos interiores.", category: "Placas de Yeso", provider: "Durlock", variants: ["12.5mm x 2.40m", "12.5mm x 2.60m", "12.5mm x 3.00m"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774992084/mh4hdrijm1lzsbcx2g5k.png", variantImgs: {"12.5mm x 2.40m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922578/ybcmova0ugq1uej9xjcv.png", "12.5mm x 2.60m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922580/hmjuomivzwjymgyvoztx.png", "12.5mm x 3.00m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922582/pgjfobgihxtslpozmj6g.png"} },
    { id: "dur_placa_rh", name: "Placa Resistente a la Humedad - RH", desc: "Ideal para baños, cocinas y ambientes húmedos.", category: "Placas de Yeso", provider: "Durlock", variants: ["12.5mm x 2.40m", "12.5mm x 2.60m"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774386372/horrdjucobl38pmpg83u.png", variantImgs: {"12.5mm x 2.40m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922584/pbzn4wr5g9krwwyrjzhk.png", "12.5mm x 2.60m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922586/naov3vkzhbvuedkcdinu.png"} },
    { id: "dur_placa_rf", name: "Placa Resistente al Fuego - RF", desc: "Mayor resistencia al fuego para sectores críticos.", category: "Placas de Yeso", provider: "Durlock", variants: ["12.5mm x 2.40m"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774386379/z7jrqua7t67x9za3jmrm.png", variantImgs: {"12.5mm x 2.40m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922588/szwjncsu7tvjghroyeyp.png"} },
    { id: "dur_placa_técnica", name: "Placas Técnicas Durlock", desc: "Placas especiales para aislamiento, acústica e impactos.", category: "Placas de Yeso", provider: "Durlock", variants: ["ACU 60", "Antihumedad AH", "Extra Resistente ER", "Cuatro Dimensiones 4D", "Semicubiertos SC", "Aquaboard"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774391701/nvnwrsjgshmbuccezxbx.png", variantImgs: {"ACU 60": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922590/pmwuuinckav6xge04ht1.png", "Antihumedad AH": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922592/asyb9ff7rc8qizm8jkp7.png", "Extra Resistente ER": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922595/bjw5t00czf3cx7iro4re.png", "Cuatro Dimensiones 4D": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922596/ohqah34z46e9sdjmttal.png", "Semicubiertos SC": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922599/mpdfv3nloo9ofuhhkujp.png", "Aquaboard": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922601/uedsm6md1xfolhuu7vhr.png"} },
    { id: "dur_placa_ciel", name: "Placa Ciel - 7mm", desc: "Placa ultra delgada para cielorrasos y curvas.", category: "Placas de Yeso", provider: "Durlock", variants: ["1.20 x 2.40m"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774391724/ybckcasp4traatnoy7mv.png", variantImgs: {"1.20 x 2.40m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922603/pp2t8lg2i08jjcdzsdcs.png"} },
    
    // DURLOCK - Cementicia y Decorativa
    { id: "dur_siding", name: "Siding Durlock", desc: "Tablas de cemento para revestimiento exterior imitación madera.", category: "Cementicia", provider: "Durlock", variants: ["8mm x 0.20 x 3.60m"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774391729/p1acbtbf9ro1b35qofxs.png", variantImgs: {"8mm x 0.20 x 3.60m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922605/wfkupbmx6rsxkanlqpuk.png"} },
    { id: "dur_superboard", name: "Superboard", desc: "Placa de cemento autoclavada estructural.", category: "Cementicia", provider: "Durlock", variants: ["6mm x 2.40m", "8mm x 2.40m", "10mm x 2.40m"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774391733/rwgydvefloauahbo5h9l.png", variantImgs: {"6mm x 2.40m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922607/lmhkwppupugz0wpijx2w.png", "8mm x 2.40m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922609/vvqfvabe5lnxb0xmdax0.png", "10mm x 2.40m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922611/mnxut5a7c10lxx6ac9jq.png"} },
    { id: "dur_simplisima", name: "Simplísima", desc: "Placa decorativa con acabados premium.", category: "Simplísima", provider: "Durlock", variants: ["Mármol Traviatta", "Madera Veteada Soft", "Madera Entablonada Soft", "Piedra Azteca"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774391741/w4jzspy81kkopwa1qez1.png", variantImgs: {"Mármol Traviatta": "https://res.cloudinary.com/doissrwhj/image/upload/v1774391744/cc851er5j5t5ggzw7jo2.png", "Madera Veteada Soft": "https://res.cloudinary.com/doissrwhj/image/upload/v1774391746/d0um6sfplah5cuat7a3n.png", "Madera Entablonada Soft": "https://res.cloudinary.com/doissrwhj/image/upload/v1774391749/v9ld3kqtxqvcc18fv2v0.png", "Piedra Azteca": "https://res.cloudinary.com/doissrwhj/image/upload/v1774391751/thd8x4nglqdcreq92w6a.png"} },
    { id: "dur_deco_vinyl", name: "Placa Deco Vinyl", desc: "Placa de yeso revestida en vinilo para cielorrasos desmontables.", category: "Deco Vinyl", provider: "Durlock", variants: ["0.60 x 0.60m", "1.20 x 0.60m"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774391753/c3ntzzotrqyeqy2czv9s.jpg", variantImgs: {"0.60 x 0.60m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922613/dfu9s9knvjyfhzbii7qq.jpg", "1.20 x 0.60m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922616/wsg9jvjisjr1qvzdbill.jpg"} },
    
    // DURLOCK - Masillas y Lana
    { id: "dur_masilla_lpu", name: "Masilla LPU Durlock", desc: "Masilla lista para usar de secado rápido.", category: "Adhesivos y Masillas", provider: "Durlock", variants: ["7kg", "18kg", "32kg", "DE10 x 32kg"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774391760/kd1lmagsu72hh7ogmpyy.jpg", variantImgs: {"7kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922618/rfmllywplaocmptsxles.jpg", "18kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922620/gres2pffyfooq5mhl6wk.jpg", "32kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922622/mvpfelzdmwkxubwnlikv.jpg", "DE10 x 32kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922622/mvpfelzdmwkxubwnlikv.jpg"} },
    { id: "dur_masilla_sr", name: "Masilla SR 30min", desc: "Masilla de fragüe rápido.", category: "Adhesivos y Masillas", provider: "Durlock", variants: ["25kg", "10kg"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774391768/j2eyjmexevt2jj1b81wj.jpg", variantImgs: {"25kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922624/oj7mnofzg2xedbgujivt.jpg", "10kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922626/cplq2hetfqi7eeo9f7aj.jpg"} },
    { id: "dur_lana_vidrio", name: "Lana de Vidrio Premium", desc: "Aislante térmico y acústico con foil de aluminio.", category: "Aislantes", provider: "Durlock", variants: ["17.40m2 x 50mm", "13.20m2 x 70mm"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774391774/gyc4v5jxm4jbre1udtl1.jpg", variantImgs: {"17.40m2 x 50mm": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922628/dxflwsfu9ouwqltqsygx.jpg", "13.20m2 x 70mm": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922629/rczfdngfcxxb5sk9dvvf.jpg"} },
    
    // BARRERA AGUA Y VIENTO
    { id: "dur_barrera", name: "Barrera de Agua y Viento", desc: "Membrana técnica hidrófuga.", category: "Aislantes", provider: "Durlock", variants: ["Rollo Estandar"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774922632/zbjbso7csglxi7ztylna.png", variantImgs: {"Rollo Estandar": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922634/veqy5dzyvzmeksjoqb84.png"} },

    // DURLOCK - Selladores y Masillas Especiales
    { id: "dur_selladores", name: "Selladores Durlock", desc: "Selladores para juntas de Superboard y terminaciones generales.", category: "Adhesivos y Masillas", provider: "Durlock", variants: ["Sellador Superboard 280ml", "Sellador Promaseal"], img: "1.png" },
    { id: "dur_masilla_ah", name: "Masilla AH Durlock", desc: "Masilla especial resistente a la humedad para ambientes húmedos.", category: "Adhesivos y Masillas", provider: "Durlock", variants: ["13kg"], img: "1.png" },
    { id: "dur_masilla_sc", name: "Masilla SC Durlock", desc: "Masilla para semicubiertos y espacios semi-exteriores.", category: "Adhesivos y Masillas", provider: "Durlock", variants: ["16kg"], img: "1.png" },
    { id: "dur_base_coat", name: "Base Coat Bicomponente Durlock", desc: "Imprimación de alta resistencia para exteriores e interiores.", category: "Adhesivos y Masillas", provider: "Durlock", variants: ["25kg"], img: "1.png" },
    
    // AISPLAC - PVC
    { id: "ais_pvc_blanco", name: "PVC Blanco", desc: "Cielorraso de PVC Blanco (20cm ancho x 1cm espesor).", category: "PVC", provider: "Aisplac", variants: ["1.00m", "1.25m", "1.50m", "1.75m", "2.00m", "2.25m", "2.50m", "2.75m", "3.00m", "3.25m", "3.50m", "4.00m", "4.50m", "5.00m", "5.50m", "6.00m", "6.50m"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774922636/psden2s2vhmani6szybs.jpg", variantImgs: {"1.00m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922638/dwnv7jai1y1nsa8etf1x.jpg", "1.25m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922639/a4dkoi3qmxrbgmile2i5.jpg", "1.50m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922641/eajwap3titypfgzmwehf.jpg", "1.75m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922643/u96uqkyxthjih975xvzi.jpg", "2.00m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922644/yvrndcjcxgj7aswnysga.jpg", "2.25m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922646/zk1toxtvmefjvdpge1vd.jpg", "2.50m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922647/pagerr3jefztrltejfpg.jpg", "2.75m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922649/kynkhsxz8pcekqrwixlt.jpg", "3.00m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922651/itailfupbumvxaoqmamo.jpg", "3.25m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922652/ltfbjiedxzykaksppudv.jpg", "3.50m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922654/devrtb6hmf6ovtoqyohc.jpg", "4.00m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922655/mvomhtbgicm6bjfqzzvn.jpg", "4.50m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922657/m1mrau2grgynkxalewjj.jpg", "5.00m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922658/lqnb2ppcvqat096uknqb.jpg", "5.50m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922660/upkj9dfqonmwq464phrs.jpg", "6.00m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922662/izcza0egqckjkkquxvwh.jpg", "6.50m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922663/uqduvl7pszahaagn17lz.jpg"} },
    { id: "ais_pvc_color", name: "PVC Color", desc: "Cielorraso de PVC color madera.", category: "PVC", provider: "Aisplac", variants: ["Fresno", "Valencia", "Negro", "Roble (5.95m)", "Nogal (5.95m)"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774461706/zaxb2omld6yzsmgr05of.png", variantImgs: {"Negro": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922664/yfyanhbfwqogfdtxygfw.jpg", "Fresno": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922667/oazokxija1kxteabjggy.png", "Valencia": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922668/wkdd9tunu7irawcv4nlt.jpg", "Roble (5.95m)": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922670/v2fp7eznsu5vwdvml4tr.jpg", "Nogal (5.95m)": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922671/cm8qtshmdx3bed9wmrac.jpg"} },
    { id: "ais_molduras", name: "Molduras PVC", desc: "Terminaciones U, N y H para cielorrasos PVC.", category: "Molduras", provider: "Aisplac", variants: ["U Blanca", "U Fresno", "U Negro", "U Nogal", "U Roble", "N Blanca", "N Fresno", "N Negro", "H Blanca", "H Fresno", "H Negro"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774461712/axl3nlqgic8hytvitike.jpg", variantImgs: {"H Blanca": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922673/tewizeqmteuzkzjrat2h.jpg", "H Fresno": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922675/rxkacgjiakcq0err5dya.jpg", "H Negro": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922676/tlltfmq0wwnwmuyp4bnx.jpg", "U Blanca": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922678/yz0g3yvtvrsgx8eo4whj.jpg", "U Fresno": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922679/ni5cuzqcvrmfbzh69qfl.jpg", "U Negro": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922681/ijz5m1nyaygx0fer2z5g.jpg", "U Nogal": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922683/uczf2son7pnk9lg6wduz.jpg", "U Roble": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922684/zbdjg1rxguvmzejs4iqb.jpg", "N Blanca": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922686/kp5xdivc23fxzhmbuzzx.jpg", "N Fresno": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922687/bpxpjyeq40t0muwxxxyt.jpg", "N Negro": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922689/evahct0xpbsxkpn7ehai.jpg"} },

    // JMA - Perfiles
    { id: "jma_montante", name: "Montante JMA", desc: "Perfil estructural de acero galvanizado.", category: "Perfiles", provider: "JMA", variants: ["34mm x 2.60m", "34mm x 4.00m", "69mm x 2.60m", "99mm x 2.60m"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774461725/vvngltdxil3xxi0gotsg.jpg", variantImgs: {"34mm x 2.60m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922691/pvs4qg0osz2mzfcx4lbw.jpg", "34mm x 4.00m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922693/lzzj79f2gjp0qfarwgd5.jpg", "69mm x 2.60m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922695/bsupdknevfpatxn4fjbe.jpg", "99mm x 2.60m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922697/bhowm3ny5qgt4jwj885c.jpg"} },
    { id: "jma_solera", name: "Solera JMA", desc: "Perfil guía para tabiques.", category: "Perfiles", provider: "JMA", variants: ["35mm x 2.60m", "35mm x 4.00m", "70mm x 2.60m", "100mm x 2.60m"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774461735/kxxw251f86vemu2l0l1e.jpg", variantImgs: {"35mm x 2.60m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922699/bck9vgshjavp9unhsylq.jpg", "35mm x 4.00m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922700/ncp8zouuwxbcc5umlavm.jpg", "70mm x 2.60m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922701/yyhxq9pqwllenlme33se.jpg", "100mm x 2.60m": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922703/xpsmd0e6zmdoulsuwiku.jpg"} },
    { id: "jma_perfiles_v", name: "Perfiles Varios JMA", desc: "Perfiles complementarios para construcción en seco.", category: "Perfiles", provider: "JMA", variants: ["Omega", "Buña Z", "Cantonera", "Ángulo Ajuste"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774461742/kk89o6a8ogg1gpz46zrg.jpg", variantImgs: {"Omega": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922704/o7hjyke1mzp8rek13tio.png", "Buña Z": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922706/vhwmgsrxipxphblyvuer.png", "Cantonera": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922707/foh78eyanfyopkybqzoa.png", "Ángulo Ajuste": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922709/js9icwk4jyc1avsiqbhr.png"} },
    // ATENNEAS
    { id: "ate_molduras", name: "Molduras Atenneas", desc: "Molduras decorativas de poliuretano (2.00mts).", category: "Molduras", provider: "Atenneas", variants: ["AT-31R", "AT-35", "AT-36", "AT-40", "AT-46", "AT-49", "AT-50", "AT-52", "AT-53", "AT-58", "AT-61R", "AT-70", "AT-76", "AT-85", "AT-90", "AT-91R", "AT-105"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774461749/oxsxlgvtdwxraggakowa.png" },
    { id: "ate_guardas", name: "Guardas Atenneas", desc: "Guardas decorativas coordinadas.", category: "Guardas", provider: "Atenneas", variants: ["AT-04", "AT-05", "AT-06", "AT-06S", "AT-07"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774461772/vefiqglgkzjtgormo3jq.jpg", variantImgs: {"AT-04": "https://res.cloudinary.com/doissrwhj/image/upload/v1774461773/rsa66ua46fqrtbj8z9cc.jpg", "AT-05": "https://res.cloudinary.com/doissrwhj/image/upload/v1774461774/sanx22nddphfdt21i7xj.jpg", "AT-06": "https://res.cloudinary.com/doissrwhj/image/upload/v1774461775/u0sz21jpqjlwwxv3ahlk.jpg", "AT-06S": "https://res.cloudinary.com/doissrwhj/image/upload/v1774461777/nuohczyontcfazipk61x.jpg", "AT-07": "https://res.cloudinary.com/doissrwhj/image/upload/v1774461779/ldj522qo4istnc7yjqox.jpg"} },
    { id: "ate_muropanel", name: "Muropanel Nude", desc: "Revestimiento de pared texturado.", category: "Revestimientos", provider: "Atenneas", variants: ["PRAGA", "TERRARUM", "FINLANDÉS", "CAJÚ"], img: "1.png" },
    { id: "ate_adhesivos", name: "Adhesivos Atenneas", desc: "Pegamento especial para poliuretano.", category: "Adhesivos", provider: "Atenneas", variants: ["Cartucho 400gr", "Pote 1.5kg", "Balde 5kg"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774476890/oimnphdavsmkd0seqazu.png", variantImgs: {"Cartucho 400gr": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922712/x8t5745wmkc9apzvzzgx.png", "Pote 1.5kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922713/ce8jkmnog1irfoziyshm.png", "Balde 5kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774922716/i03gjlr3c1ccirdu60oc.png"} },

    // MAROPOR
    { id: "mar_masilla_lpu", name: "Masilla LPU Maropor", desc: "Masilla lista para usar.", category: "Masilla", provider: "Maropor", variants: ["Doypack 2kg", "Balde 7kg", "Balde 16kg", "Balde 32kg", "Balde 32kg DE10"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774491664/cmqdzj2iw3nsquhv3teg.jpg", variantImgs: {"Doypack 2kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491666/twvaioyltfk6obzrieth.jpg", "Balde 7kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491667/ypxofwjq6wnzq5l1duvb.jpg", "Balde 16kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491669/j7uifpobh6g0aalpzf8v.jpg", "Balde 32kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491670/kefsschrbcgqyuop5v9b.jpg", "Balde 32kg DE10": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491670/kefsschrbcgqyuop5v9b.jpg"} },
    { id: "mar_masilla_duo", name: "Masilla + Enduido 2 en 1", desc: "Combinación de masilla de fragüe y enduido.", category: "Masilla", provider: "Maropor", variants: ["1.7kg", "7kg", "16kg", "32kg"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774491671/qdiw9nadu4kinbsw6tsc.jpg", variantImgs: {"1.7kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491673/y1bjpuqltqu1ttgmhgue.jpg", "7kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491674/twxkgvpnbsdc2actzxir.jpg", "16kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491675/wk0dijgguncxiblikigi.jpg", "32kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491677/iidvgj1svqjlltc8evjw.jpg"} },
    { id: "mar_masilla_ext", name: "Masilla Exterior Maropor", desc: "Masilla reforzada para exteriores.", category: "Masilla", provider: "Maropor", variants: ["1.5kg", "6kg", "15kg", "30kg"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774491678/nsoqacg6dmvh3wyruhdz.jpg", variantImgs: {"1.5kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491679/p0gvsemtrvuti2ktsqfs.jpg", "6kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491680/fqf0a6eqqqx0fdvzcvlp.jpg", "15kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491682/go0ugvevwdctdr7alar6.jpg", "30kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491683/loih34xxtyxqzqvdp0zi.jpg"} },
    { id: "mar_adhesivo_moldura", name: "Adhesivo Moldura Maropor", desc: "Pegamento para moldura interior.", category: "Adhesivos", provider: "Maropor", variants: ["Cartucho 450gr", "Doypack 1kg", "Pote 1kg", "Balde 7kg"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774491684/sais5ijkfcrta3df3lyu.jpg", variantImgs: {"Cartucho 450gr": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491685/ahe7nmah7bu8u1blbflw.jpg", "Doypack 1kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491687/hcbb4eynm3ibvbbwbf5g.jpg", "Pote 1kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491688/lu9xjhwti0wm7mdzf8nc.jpg", "Balde 7kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491689/vi0mfmjqkgonbqznjfz3.jpg"} },
    { id: "mar_adhesivo_zocalo", name: "Adhesivo Zócalo Maropor", desc: "Pegamento extra fuerte para zócalos.", category: "Adhesivos", provider: "Maropor", variants: ["Cartucho 450gr", "Pote 1.7kg", "Balde 7kg"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774491690/yfo1fyy1iddxzodunnom.jpg", variantImgs: {"Cartucho 450gr": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491691/v6jdoszlo8m7peqbzhct.jpg", "Pote 1.7kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491692/mhea1vqgt2wij8d8ajyq.jpg", "Balde 7kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491694/kfrgeb3jlalltzipjg3q.jpg"} },
    { id: "mar_molduras", name: "Molduras Maropor", desc: "Molduras decorativas de poliestireno (2.00mts).", category: "Molduras", provider: "Maropor", variants: ["M30", "M33", "M35", "M37", "M40", "M42", "M46", "M47", "M49", "M60", "M68", "M78", "MP1", "MP2", "MP3", "MP18"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774491695/lwal4tiasvnqvdpbnnn7.jpg", variantImgs: {"M30": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491697/lh6hvtvjsdfoampoymzp.jpg", "M33": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491699/vsehsp8n9ermfu2gpmgv.jpg", "M35": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491700/l27ffk4u9uorhkpfilbq.jpg", "M37": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491702/ojocokh7dtzo4o3bhnun.jpg", "M40": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491703/aoperpggingdji2l9xjn.jpg", "M42": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491704/zapscy2w3l1cbwexjwcv.jpg", "M46": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491706/dvywdhad4nl4xjfx1tnk.jpg", "M47": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491707/d46koqhx8anbg7vpkxer.jpg", "M49": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491708/xmyo6brnroqjgin3gazh.jpg", "M60": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491710/kvpch3akuoaf1uadhulj.jpg", "M68": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491711/nkc4vhv3gwbqe0rhfwj5.jpg", "M78": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491712/lhme3uvmy5e1xsigwew0.jpg", "MP18": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491713/afot05qyfpbzl2it5gdr.jpg", "MP1": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491714/ctirlfmgfzderktsehuy.jpg", "MP2": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491715/v24tvzhpnawygc3cvgvk.jpg", "MP3": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491717/m2iuorwdickmx9bqroiu.jpg"} },
    { id: "mar_desmontables", name: "Perfiles Desmontables Maropor", desc: "Sistema de suspensión para cielorrasos.", category: "Perfiles", provider: "Maropor", variants: ["Larguero 3.66", "Travesaño 0.61", "Travesaño 1.22", "Perimetral 3.05"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774491719/vnkkie0lmoqhfesp3kw3.jpg", variantImgs: {"Larguero 3.66": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491722/h3gtpo7m7hx1nkbxipgc.jpg", "Travesaño 1.22": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491723/tul9mfdrulqk92yshanc.jpg", "Travesaño 0.61": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491725/cc3kwdeum79p6041k5ud.jpg", "Perimetral 3.05": "https://res.cloudinary.com/doissrwhj/image/upload/v1774491727/dryd2w1ji1d2ikxci9th.jpg"} },

    // ACON
    { id: "aco_gargantas", name: "Gargantas ACON", desc: "Gargantas para iluminación LED perimetral.", category: "Iluminación", provider: "ACON", variants: ["GIL 1 (Pared/Techo)", "GIL 3 (Central)", "GIF 2 (Perimetral)", "GIM 1 (LED)", "CZI (Cortinero)"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774992087/nnyy0xh7lroflui8zoqj.jpg", variantImgs: {"GIL 1 (Pared/Techo)": "https://res.cloudinary.com/doissrwhj/image/upload/v1774992093/ustoa1djdrv14jvgz4jo.jpg", "GIL 3 (Central)": "https://res.cloudinary.com/doissrwhj/image/upload/v1774992100/ycmy8uuue6geldhvspxo.jpg", "GIF 2 (Perimetral)": "https://res.cloudinary.com/doissrwhj/image/upload/v1774992107/hukvcpwuvrjg9ozcb0ks.jpg", "GIM 1 (LED)": "https://res.cloudinary.com/doissrwhj/image/upload/v1774992111/gh3baoazjlzj6uyorlvf.jpg"} },

    // IPROA
    { id: "ipr_cortinas", name: "Cortinas IPROA", desc: "Sistemas de cortinería a medida.", category: "Cortinas", provider: "IPROA", variants: ["Roller", "Roller Doble", "Veneciana Alum.", "Bandas Vert.", "Parcelle"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774479022/dgyhqhmlb62qqqzhxhoq.jpg" },

    // TELPLAST Y OTROS QUÍMICOS / ADHESIVOS
    { id: "tel_pegamentos", name: "Pegamentos y Químicos TelPlast", desc: "Soluciones de adhesión para obra.", category: "Adhesivos", provider: "TelPlast", variants: ["Cola 1kg", "Cola 500gr", "Cola 250gr", "Cola 125gr", "WOW 50gr Pomo", "WOW 120gr Pomo", "WOW 400gr Cartucho", "Masilla Madera 1.7kg", "Masilla Madera 500gr", "Masilla Yeso 32kg", "Fijador al Agua 4Lt", "Fijador al Agua 1Lt", "Sellador Grietas 400gr", "Sellador Multipropósito 300gr"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774476896/bwks5hfazzgwxoeuccnm.jpg", variantImgs: {"WOW 400gr Cartucho": "https://res.cloudinary.com/doissrwhj/image/upload/v1774975762/zb9ph8vl69nzwchb3q0k.jpg", "WOW 120gr Pomo": "https://res.cloudinary.com/doissrwhj/image/upload/v1774975764/qq29fchx8vreh5trdcpw.jpg", "Cola 1kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774975767/kq0vm44ma8flgaibda5q.jpg", "Cola 500gr": "https://res.cloudinary.com/doissrwhj/image/upload/v1774975770/f1u7qxhdscephyxcfqsf.jpg", "Cola 250gr": "https://res.cloudinary.com/doissrwhj/image/upload/v1774975773/wf7dyskwmcc6dvvrwhdi.jpg", "Masilla Madera 1.7kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774975775/pmrf4lxf9xb14krqydib.jpg", "Masilla Madera 500gr": "https://res.cloudinary.com/doissrwhj/image/upload/v1774975778/cthry43xiviaqipzqofv.jpg", "Masilla Yeso 32kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774975780/afqvqlxivijki7fmgjhy.jpg", "Sellador Grietas 400gr": "https://res.cloudinary.com/doissrwhj/image/upload/v1774975782/b4atlsanydjalb9dlimx.jpg", "Fijador al Agua 4Lt": "https://res.cloudinary.com/doissrwhj/image/upload/v1774975784/rqt1x663awar35p8m4se.jpg"} },
    { id: "otros_fastix", name: "Selladores Fastix", desc: "Selladores de silicona multiusos.", category: "Adhesivos", provider: "Otros Productos", variants: ["25g", "100g", "280g"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774992114/l2xbzrxzxeiseus4ckwc.png", variantImgs: {"25g": "https://res.cloudinary.com/doissrwhj/image/upload/v1774992116/l4bgh6pxslo7uappw40s.png", "100g": "https://res.cloudinary.com/doissrwhj/image/upload/v1774992118/vwtfirtnfbrlge0kvp5c.png", "280g": "https://res.cloudinary.com/doissrwhj/image/upload/v1774992120/wbhaco2wse6um5yjgvvm.png"} },
    { id: "otros_poximix", name: "Poxi-mix", desc: "Masa reparadora instantánea.", category: "Adhesivos", provider: "Otros Productos", variants: ["500g", "1.25kg", "3kg", "5kg"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774992122/pw38qo0rwiukewmkrbzw.png", variantImgs: {"500g": "https://res.cloudinary.com/doissrwhj/image/upload/v1774992125/doy4cbeyif0fnldpimpa.png", "5kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774992127/t2497keskld10vaxbpvy.png", "1.25kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774992129/dkyq5axpyrkjyj9athjb.png", "3kg": "https://res.cloudinary.com/doissrwhj/image/upload/v1774992131/y13c2uourpdhzkp5igej.png"} },
    { id: "otros_pulpito", name: "Pulpito Pegamento", desc: "Pegamento universal de secado rápido.", category: "Adhesivos", provider: "Otros Productos", variants: ["50g", "120g"], img: "https://res.cloudinary.com/doissrwhj/image/upload/v1774992133/bhie6ufjuwzhhqwfvv8x.png", variantImgs: {"50g": "https://res.cloudinary.com/doissrwhj/image/upload/v1774992135/psnayovo9pmbq7zneqo2.png", "120g": "https://res.cloudinary.com/doissrwhj/image/upload/v1774992138/il1xl7y6evt4hw8thqvn.png"} },
    { id: "otros_lijas", name: "Lijas No Past", desc: "Lijas al agua de todas las medidas.", category: "Accesorios", provider: "Otros Productos", variants: ["Grano 80", "Grano 100", "Grano 120", "Grano 150", "Grano 180", "Grano 220", "Grano 360", "Botella x 125gr", "Pote x 500gr"], img: "1.png" },

    // PERFILES ALUMINIO / INOX
    { id: "alum_angulos", name: "Ángulos Aluminio Anodizado", desc: "Plata, Oro, Champagne, Bronce.", category: "Perfiles", provider: "Otros Productos", variants: ["2510 x 2.40m", "2520 x 2.00m", "3030 x 2.00m", "Base x 0.90m", "Desnivel x 0.90m", "Nivelador x 0.90m", "Tapajunta x 0.90m", "Transición x 0.90m"], img: "1.png" },
    { id: "inox_perfiles", name: "Perfiles Acero Inoxidable", desc: "Elegantes perfiles para guardacantos.", category: "Perfiles", provider: "Otros Productos", variants: ["Ángulo Tapacanto 15mm", "Ángulo Tapacanto 20mm", "Guardacanto 9mm", "Guardacanto 12mm", "Separador T 15mm", "Separador T 20mm"], img: "1.png" },
    { id: "alum_puerta", name: "Puerta Ventana Aluminio", desc: "Sistema para encastre en construcción en seco.", category: "Aberturas", provider: "Otros Productos", variants: ["Plata/Oro/Champagne/Bronce x 2.40m"], img: "1.png" },

    // CASETO
    { id: "cas_accesorios", name: "Accesorios Caseto", desc: "Perfilería y accesorios de terminación.", category: "Accesorios", provider: "Caseto", variants: ["Ángulo 320", "Ángulo 300", "Ángulo 301", "Ángulo 1012", "Fleje 321", "Fleje 324", "Media Caña 1020", "Perfil T1 - 309", "Perfil T2 - 310"], img: "1.png" },

    // OTROS PRODUCTOS - MADERAS
    { id: "mar_liston_cep", name: "Listón de Pino Cepillado", desc: "Listones de pino de alta calidad para carpintería y construcción.", category: "Maderas y Fenólicos", provider: "Otros Productos", variants: ["1x1 x 3.05", "1x1 1/2 x 3.05", "1x2 (2.75m a 3.95m)", "2x2 x 3.05", "3x3 x 3.05"], img: "1.png" },
    { id: "mar_liston_sce", name: "Listón de Pino S/Cepillar", desc: "Listones en bruto para estructura y usos generales.", category: "Maderas y Fenólicos", provider: "Otros Productos", variants: ["1x2 (2.75m a 3.95m)"], img: "1.png" },
    { id: "mar_tabla_pino", name: "Tabla de Pino S/Cepillar", desc: "Tablas de pino brutas en diversas medidas.", category: "Maderas y Fenólicos", provider: "Otros Productos", variants: ["1x3 x 3.05", "1x4 x 3.05", "1x5 x 3.05", "1x6 x 3.05", "1x8 x 3.05", "1x10 x 3.05", "1x12 x 3.05"], img: "1.png" },
    { id: "mar_machimbre", name: "Machimbre de Pino", desc: "Tablas machiembradas para cielorrasos y revestimientos.", category: "Maderas y Fenólicos", provider: "Otros Productos", variants: ["1/2\" (3.05m a 3.95m)", "3/4\" (x 3.05/3.65)", "1\" (x 3.05/3.65)"], img: "1.png" },
    { id: "mar_fenolico", name: "Placas Fenólicas", desc: "Tableros de pino compensados de gran resistencia.", category: "Maderas y Fenólicos", provider: "Otros Productos", variants: ["6mm - 1.22x2.44", "9mm - 1.22x2.44", "12mm - 1.22x2.44", "15mm - 1.22x2.44", "18mm - 1.22x2.44", "Industrial 15mm", "Industrial 18mm"], img: "1.png" },
    { id: "mar_osb", name: "Placas OSB", desc: "Tableros de virutas orientadas para usos estructurales.", category: "Maderas y Fenólicos", provider: "Otros Productos", variants: ["9mm", "11mm", "15mm", "18mm"], img: "1.png" },
    { id: "mar_bastidor", name: "Bastidor de Pino", desc: "Estructura de pino x 3.00mts.", category: "Maderas y Fenólicos", provider: "Otros Productos", variants: ["3.00m"], img: "1.png" },

    // SIDING METÁLICO
    { id: "mar_siding_met", name: "Siding Metálico Premium", desc: "Revestimiento metálico texturado de alta durabilidad.", category: "Siding", provider: "Otros Productos", variants: ["Gris (LZG-701)", "Marrón Oscuro (LZG-A008)", "Marrón (LZG-A004)", "Marrón Claro (LZG-A001)"], img: "1.png" },
    { id: "mar_siding_perfiles", name: "Perfiles para Siding Metálico", desc: "Accesorios de terminación para siding.", category: "Siding", provider: "Otros Productos", variants: ["Esq. Interior", "Esq. Exterior", "Perfil de Unión", "Inicio/Terminación"], img: "1.png" },

    // PLACAS UV
    { id: "mar_placa_uv_std", name: "Placas UV - 1.22 x 2.44", desc: "Placas decorativas con acabado simil mármol y piedras.", category: "Placas UV", provider: "Otros Productos", variants: ["Tundra", "Estepa", "Armani", "Statuario", "Wood", "Brick Grey", "Thassos Blanco", "Calacatta", "Marquina", "Crema Marfil", "Sierra Gris", "Carrara", "Crema Cenato", "Marfil Gris", "Calacatta Gold", "Calatorao", "Nilo", "Damero Blanco", "Carrara Italiano", "Zulo", "Patagonia", "Porfido Gris"], img: "1.png" },
    { id: "mar_placa_uv_xl", name: "Placa UV XL - 1.22 x 2.80", desc: "Formato extendido para grandes superficies.", category: "Placas UV", provider: "Otros Productos", variants: ["Marmara (2.80m)"], img: "1.png" },
    { id: "mar_adh_uv", name: "Adhesivo Placas UV", desc: "Pegamento específico para la correcta instalación de placas UV.", category: "Placas UV", provider: "Otros Productos", variants: ["Cartucho x 300ml"], img: "1.png" },

    // ZÓCALOS DE PVC
    { id: "mar_zocalo_tr", name: "Zócalo PVC Top Round", desc: "Zócalos curvos de alta resistencia y fácil limpieza.", category: "Zócalos", provider: "Otros Productos", variants: ["57mm x 2400 (TR57)", "75mm Blanco Polar", "75mm Negro Azabache", "75mm Roble/Gris/Plata", "100mm x 2400 (TR100)"], img: "1.png" },
    { id: "mar_zocalo_tl", name: "Zócalo PVC Top Line", desc: "Zócalos rectos modernos para ambientes minimalistas.", category: "Zócalos", provider: "Otros Productos", variants: ["75mm x 2400 (TL75)", "100mm x 2400 (TL100)", "120mm x 2400 (TL120)", "150mm x 2400 (TL150)"], img: "1.png" },
    { id: "mar_zocalo_especial", name: "Zócalos Especiales PVC", desc: "Modelos específicos para mayor cobertura o diseño.", category: "Zócalos", provider: "Otros Productos", variants: ["SX105 (108mm Alto)", "Cover Blanco (100mm)"], img: "1.png" },

    // PISOS FLOTANTES
    { id: "mar_piso_vinilico", name: "Piso Vinílico Click", desc: "Pisos de PVC de alta resistencia con sistema de encastre click.", category: "Pisos", provider: "Otros Productos", variants: ["Timberlux (Sandalwood/Oak)", "Stone (Mármol/Piedra)", "Harmony (Bisque/Amber/Silver)", "Lounge (Roble Brandy)", "Rustic (Fox/Millenium/Camel)", "Pinar (Helsinki/Bergen)", "Extreme (Toscana/Tivoli/Treviso)"], img: "1.png" },
    { id: "mar_piso_melaminico", name: "Piso Melamínico Click", desc: "Pisos flotantes de madera melamínica de alto tránsito.", category: "Pisos", provider: "Otros Productos", variants: ["Cerezo Historic D2838", "Roble Assago L8653", "Roble Rústico L8617", "Roble Strassburgo D8011", "Roble Rift D3044", "Roble Montreux D3783", "Roble New York D8014", "Roble Lugano D3180"], img: "1.png" },

    // DECKS Y REVESTIMIENTOS
    { id: "mar_deck_composite", name: "Deck de Composite", desc: "Tablas para exterior sin mantenimiento, imitación madera.", category: "Deck", provider: "Otros Productos", variants: ["Línea C (D02, D11, D12, D06...)", "Línea B (Charcoal, Ipe, Teak, Antique)"], img: "1.png" },
    { id: "mar_wall_panel_ext", name: "Wall Panel Exterior", desc: "Paneles de exterior resistentes a la intemperie.", category: "Wall Panel", provider: "Otros Productos", variants: ["Light Grey", "Ipe", "Charcoal", "Teak", "Antique", "Oak", "Silver Grey"], img: "1.png" },
    { id: "mar_rev_acustico", name: "Revestimiento Acústico", desc: "Paneles ranurados para tratamiento acústico y diseño.", category: "Revestimientos", provider: "Otros Productos", variants: ["Fresno", "Nogal", "Jatoba"], img: "1.png" },
    { id: "mar_rev_interior", name: "Revestimiento de Pared Interior", desc: "Lamas decorativas para interiores modernos.", category: "Revestimientos", provider: "Otros Productos", variants: ["Panel Marfil/Gris/Roble/Incienso", "Perfiles de Inicio", "Perfiles de Terminación"], img: "1.png" },
    { id: "mar_decopanel", name: "Decopanel Revestimiento", desc: "Revestimientos texturados premium en diversas tramas.", category: "Revestimientos", provider: "Otros Productos", variants: ["Cotton", "Felt", "Silk", "Linen", "3D (Silk/Cotton/Felt)", "Accesorios (Unión, Term, Esq)"], img: "1.png" },

    // REVESTIMIENTOS FLAT, SHARP, CURLY, 3D
    { id: "mar_rev_flat", name: "Revestimiento Interior Flat", desc: "Lamas lisas para un acabado moderno y minimalista.", category: "Revestimientos", provider: "Otros Productos", variants: ["Panel (Negro/Gris/Crema)", "Perfil Inicio (Negro/Gris/Crema)", "Perfil Term (Negro/Gris/Crema)"], img: "1.png" },
    { id: "mar_rev_sharp", name: "Revestimiento Interior Sharp", desc: "Diseño con aristas marcadas para texturas profundas.", category: "Revestimientos", provider: "Otros Productos", variants: ["Ocean", "Nature", "Forest"], img: "1.png" },
    { id: "mar_rev_curly", name: "Revestimiento Interior Curly", desc: "Revestimiento con terminación curva elegante.", category: "Revestimientos", provider: "Otros Productos", variants: ["Dusty", "Root", "Ash"], img: "1.png" },
    { id: "mar_rev_flat_3d", name: "Revestimiento Flat 3D", desc: "Revestimientos con relieve tridimensional de alta gama.", category: "Revestimientos", provider: "Otros Productos", variants: ["Black Oak", "Oak", "Verde Aqua"], img: "1.png" },

    // ESPEJOS Y PISO EN ROLLO
    { id: "mar_espejos_led", name: "Espejo LED Premium", desc: "Espejos con iluminación LED integrada de diversos formatos.", category: "Espejos", provider: "Otros Productos", variants: ["K202 (600x800)", "HKM2011 (600x600)", "HKM 5008 (500x1400)"], img: "1.png" },
    { id: "mar_piso_rollo", name: "Piso Vinílico en Rollo", desc: "Pisos de PVC en rollo de fácil instalación y variados diseños.", category: "Pisos", provider: "Otros Productos", variants: ["JY007/061/6123 (0.5mm)", "12501/6631 (1.2mm)", "MW-4/1707/201-4 (1.2mm)"], img: "1.png" },

    // CÉSPED Y JARDÍN VERTICAL
    { id: "mar_cesped_sintetico", name: "Césped Sintético", desc: "Césped artificial de alta calidad para exteriores y deportes.", category: "Césped y Jardín", provider: "Otros Productos", variants: ["Soft", "Invierno Azul Soft", "Sport Soft", "Otoño Corto"], img: "1.png" },
    { id: "mar_jardin_vertical", name: "Jardín Vertical Artificial", desc: "Paneles decorativos de follaje sintético para paredes.", category: "Césped y Jardín", provider: "Otros Productos", variants: ["Mediterránea/Aralia", "Hiedra/Lavanda/Fotinia", "Buxus", "Cipres", "Gardenia", "Jazmín", "Musgo", "Sauce", "Melisa"], img: "1.png" },

    // TORNILLOS Y FIJACIONES
    { id: "mar_fijaciones", name: "Fijaciones y Tarugos", desc: "Sistemas de fijación para diversos tipos de muros.", category: "Tornillería", provider: "Otros Productos", variants: ["Fijación del 6 S/Tope", "Fijación del 6 C/Tope", "Fijación del 6 Universal", "Fijación del 8 S/Tope", "Fijación del 8 C/Tope", "Fijación del 8 Universal", "Taco Espiral para Yeso", "Tornillos con Alas P/M 8x1 1/4"], img: "1.png" },
    { id: "mar_tornillos_t", name: "Tornillos T1 a T5", desc: "Tornillería técnica para construcción en seco.", category: "Tornillería", provider: "Otros Productos", variants: ["T1 (P/M o P/A)", "T2 (P/M o P/A)", "T3 P/A", "T4 P/A", "T5 P/A"], img: "1.png" },

    // ACCESORIOS VARIOS Y QUÍMICOS
    { id: "mar_adhesivos_obra", name: "Adhesivos y Espumas de Obra", desc: "Cementos de contacto y espumas de poliuretano para fijación.", category: "Accesorios y Químicos", provider: "Otros Productos", variants: ["Cem. Contacto (1/4, 1/2, 1, 4 Lts)", "Espuma Poliuretano 300ml"], img: "1.png" },
    { id: "mar_cintas", name: "Cintas de Instalación", desc: "Cintas microperforadas y térmicas para juntas y terminaciones.", category: "Accesorios y Químicos", provider: "Otros Productos", variants: ["Microperforada (75/150m)", "Mesh (45/90m)"], img: "1.png" },
    { id: "mar_aislantes", name: "Aislantes y Mantas", desc: "Soluciones de aislamiento térmico y acústico para suelos y muros.", category: "Aislantes", provider: "Otros Productos", variants: ["Espuma FOAM 10mm (1x20)", "Sound Block 1.5mm x 18.60m2", "Bajo Piso Niveladora 2mm", "Silent Steep 1mm (18.6m2)"], img: "1.png" },
    { id: "mar_eps", name: "EPS - Telgopor", desc: "Planchas de poliestireno expandido de diversos espesores.", category: "Aislantes", provider: "Otros Productos", variants: ["1cm", "1.5cm", "2cm", "2.5cm", "3cm"], img: "1.png" },
    { id: "mar_varios_obra", name: "Varios Obra", desc: "Complementos necesarios para finalización de obra.", category: "Accesorios", provider: "Otros Productos", variants: ["Malla Fibra 90g/120g"], img: "1.png" },
    { id: "mar_puerta_pvc", name: "Puerta Plegadiza PVC", desc: "Puertas plegables de PVC a medida.", category: "Accesorios", provider: "Otros Productos", variants: ["0.75m x 2.04m", "0.85m x 2.04m", "0.95m x 2.04m"], img: "1.png" },
    { id: "mar_tapa_ins", name: "Tapa de Inspección", desc: "Tapas para cielorrasos y tabiques.", category: "Accesorios", provider: "Otros Productos", variants: ["0.40m x 0.40m", "0.60m x 0.60m"], img: "1.png" },
    { id: "mar_escaleras", name: "Escalera Madera Familiar", desc: "Escaleras ligeras y resistentes de pino estándar.", category: "Accesorios", provider: "Otros Productos", variants: ["5 Escalones (1.33m)", "6 Escalones (1.59m)", "7 Escalones (1.85m)", "8 Escalones (2.12m)", "9 Escalones (2.39m)"], img: "1.png" },

    // ACCESORIOS VARIOS
    { id: "acc_muebles_maderas", name: "Accesorios para Mueble y Maderas", desc: "Manijas, tiradores, soportes, escuadras, bisagras, pasadores, regatones, perchas, ruedas, blíster para ranurado, embellecedores y más.", category: "Accesorios", provider: "Otros Productos", variants: ["Consultar disponibilidad"], img: "1.png" },
    { id: "acc_construccion_pintura", name: "Accesorios para Construcción y Pintura", desc: "Rodillos, pinceles, llanas, fratachos, pistolas, discos, cutter, cintas métricas, espátulas, cintas de enmascarar, ingletes, respiradores y más.", category: "Accesorios", provider: "Otros Productos", variants: ["Consultar disponibilidad"], img: "1.png" },
    { id: "acc_cortinados", name: "Accesorios para Cortinados", desc: "Barrales de madera, caños de hierro, soportes y punteras para cortinas.", category: "Accesorios", provider: "Otros Productos", variants: ["Consultar disponibilidad"], img: "1.png" },
    { id: "acc_bano", name: "Accesorios para Baño", desc: "Caños extensibles, caños curvos, cortinas protector, ganchos, perchas plásticas y soportes para baño.", category: "Accesorios", provider: "Otros Productos", variants: ["Consultar disponibilidad"], img: "1.png" }
];

// Select Variant logic
window.selectVariant = function(productId, variantName, element) {
    // UI Update: toggle chips
    const card = element.closest('.product-card');
    card.querySelectorAll('.variant-chip').forEach(c => c.classList.remove('active'));
    element.classList.add('active');
    
    // Update Add Button data-variant
    const addBtn = document.getElementById(`add-btn-${productId}`);
    if (addBtn) {
        addBtn.setAttribute('data-variant', variantName);
    }

    // Update Image if Variant has a mapped image
    const p = productsData.find(x => x.id === productId);
    if (p) {
        const imgEl = card.querySelector('.product-img');
        if (imgEl) {
            if (p.variantImgs && p.variantImgs[variantName]) {
                imgEl.src = p.variantImgs[variantName];
                if (addBtn) addBtn.dataset.img = p.variantImgs[variantName];
            } else if (p.img) {
                // Fallback to main image if no variant image mapped
                imgEl.src = p.img;
                if (addBtn) addBtn.dataset.img = p.img;
            }
        }
        
        // Update OUT OF STOCK status
        const isOOS = (p.outOfStock || []).includes(variantName);
        const badge = document.getElementById(`oos-badge-${productId}`);
        if (badge) badge.style.display = isOOS ? 'block' : 'none';
        
        const addBtnText = document.getElementById(`add-text-${productId}`);
        if (addBtn) {
            addBtn.disabled = isOOS;
            if (addBtnText) addBtnText.innerText = isOOS ? 'Sin Stock' : 'Agregar';
        }
    }
};

// Sync Catalog: only ADDS products missing from Firestore, never overwrites existing ones
async function purgeAndResetCatalog() {
    if (!isAdminUser) return;

    const choice = confirm(
        "SINCRONIZAR CATÁLOGO\n\n" +
        "✅ Aceptar → Agregar solo productos NUEVOS que falten (no borra ni pisa nada).\n" +
        "❌ Cancelar → No hacer nada."
    );
    if (!choice) return;

    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const existingIds = new Set(querySnapshot.docs.map(d => d.id));
        const toAdd = defaultProducts.filter(p => !existingIds.has(p.id));

        if (toAdd.length === 0) {
            alert("✅ El catálogo ya está al día. No hay productos nuevos para agregar.");
            return;
        }

        for (const p of toAdd) {
            await setDoc(doc(db, "products", p.id), p);
        }

        alert(`✅ Se agregaron ${toAdd.length} productos nuevos. La página se recargará.`);
        window.location.reload();
    } catch (error) {
        console.error("Error en la sincronización:", error);
        alert("Error al sincronizar: " + error.message);
    }
}
window.purgeAndResetCatalog = purgeAndResetCatalog;

// RESET TOTAL (destructivo) - solo para emergencias extremas
async function hardResetCatalog() {
    if (!isAdminUser) return;
    if (!confirm("⚠️ RESET TOTAL\n\nBorrará TODOS los productos (incluyendo imágenes cargadas manualmente) y reimportará desde cero.\n\n¿Estás seguro?")) return;
    if (!confirm("Segunda confirmación: Esta acción NO se puede deshacer. ¿Continuar?")) return;
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        for (const docSnap of querySnapshot.docs) {
            await deleteDoc(doc(db, "products", docSnap.id));
        }
        for (const p of defaultProducts) {
            await setDoc(doc(db, "products", p.id), p);
        }
        alert("Reset total completado. La página se recargará.");
        window.location.reload();
    } catch (error) {
        alert("Error: " + error.message);
    }
}
window.hardResetCatalog = hardResetCatalog;

// Load from Firestore
async function initializeProducts() {
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const fbProducts = [];
        querySnapshot.forEach((doc) => {
            fbProducts.push({ id: doc.id, ...doc.data() });
        });
        
        // Fusión: Priorizar Firestore pero inyectar defaults faltantes
        const fbIds = new Set(fbProducts.map(p => p.id));
        const missingDefaults = defaultProducts.filter(p => !fbIds.has(p.id));
        productsData = [...fbProducts, ...missingDefaults];

        // Botón de sincronización para administradores
        if (isAdminUser) {
            const controls = document.querySelector('.catalog-controls');
            if (controls && !document.getElementById('btn-reset-catalog')) {
                const btn = document.createElement('button');
                btn.id = 'btn-reset-catalog';
                btn.className = 'btn btn-danger';
                btn.style.marginLeft = '1rem';
                btn.innerHTML = '<i class="fas fa-sync-alt"></i> Sincronizar Catálogo Oficial';
                btn.onclick = purgeAndResetCatalog;
                controls.appendChild(btn);
            }
        }

        // Aviso de catálogo antiguo o desactualizado
        const isLegacy = productsData.some(p => !p.variants || p.variants.length === 0);
        if (isLegacy && isAdminUser) {
            setTimeout(() => {
                alert(`AVISO: Hay ${missingDefaults.length} productos nuevos para sincronizar. Usa el botón rojo.`);
            }, 1000);
        }

        // Migración de imágenes antiguas
        if (isAdminUser) {
            for (const p of productsData) {
                if (p.img && (p.img.includes('proveedores/') || p.img.includes('picsum.photos'))) {
                    p.img = '1.png';
                    await saveProduct(p);
                }
            }
        }
    } catch (error) {
        console.error("Error loading products:", error);
        if (productsData.length === 0) {
            productsData = [...defaultProducts];
        }
    } finally {
        renderFilters();
        renderProducts();
    }
}

async function saveProduct(product) {
    try {
        await setDoc(doc(db, "products", String(product.id)), product);
    } catch (e) {
        console.error("Error saving product: ", e);
        throw e;
    }
}

// Function to render products
function renderProducts() {
    const grid = document.getElementById('products-grid');
    const stats = document.getElementById('stats-info');
    grid.innerHTML = '';

    // Apply Filters
    let filtered = productsData;

    // 1. Text Search
    if (currentSearch.trim() !== '') {
        const term = currentSearch.toLowerCase();
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(term) ||
            p.desc.toLowerCase().includes(term) ||
            p.category.toLowerCase().includes(term) ||
            p.provider.toLowerCase().includes(term) ||
            (p.variants && p.variants.some(v => v.toLowerCase().includes(term)))
        );
    }

    // 2. Categories Filter
    if (selectedCategories.size > 0) {
        filtered = filtered.filter(p => selectedCategories.has(p.category));
    }

    // 3. Providers Filter
    if (selectedProviders.size > 0) {
        filtered = filtered.filter(p => selectedProviders.has(p.provider));
    }

    // 4. Colors Filter
    if (selectedColors.size > 0) {
        filtered = filtered.filter(p => selectedColors.has(p.color));
    }

    // Pagination
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    if (currentPage > totalPages) currentPage = totalPages || 1;

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const paginated = filtered.slice(start, end);

    // Render
    if (paginated.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); font-size: 1.2rem; padding: 2rem;">No se encontraron productos en el catálogo que coincidan con la búsqueda.</p>';
    } else {
        paginated.forEach(p => {
            let defaultVariant = p.variants && p.variants.length > 0 ? p.variants[0] : 'main';
            let isOOS = false;
            if (p.variants && p.variants.length > 0) {
                isOOS = (p.outOfStock || []).includes(defaultVariant);
            } else {
                isOOS = p.outOfStock === true || (Array.isArray(p.outOfStock) && p.outOfStock.includes('main'));
            }

            const card = document.createElement('div');
            card.className = 'product-card glass reveal delay-2';
            card.innerHTML = `
                <a href="producto-detalle.html?id=${p.id}" class="product-link" style="text-decoration: none; color: inherit; display: flex; flex-direction: column; flex: 1;">
                    <div style="position: relative; overflow: hidden; height: 200px; background: #ffffff; display: flex; align-items: center; justify-content: center;">
                         <img src="${p.img}" alt="${p.name}" class="product-img" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;">
                         <div class="out-of-stock-badge" id="oos-badge-${p.id}" style="display: ${isOOS ? 'block' : 'none'};">SIN STOCK</div>
                         <div class="product-hover-overlay">
                            <span class="btn btn-secondary">Ver detalles</span>
                         </div>

                    </div>
                    <div class="product-info" style="padding: 1.5rem; flex: 1; display: flex; flex-direction: column;">
                        <span class="product-provider-badge">${p.provider}</span>
                        <h3 class="product-title" style="margin: 0.5rem 0; font-size: 1.1rem;">${p.name}</h3>
                        <p class="product-desc" style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem; flex: 1;">${(p.desc || '').replace(/\n/g, '<br>')}</p>
                        
                        <!-- Variant Selector -->
                        ${p.variants && p.variants.length > 0 ? `
                        <div class="variant-selector" onclick="event.preventDefault(); event.stopPropagation();">
                            <label style="font-size: 0.8rem; color: var(--accent-color); margin-bottom: 0.4rem; display: block;">Seleccionar ${p.category.includes('PVC') || p.category.includes('Moldura') ? 'Medida/Color' : 'Medida'}:</label>
                            <div class="variant-chips">
                                ${p.variants.map((v, idx) => `
                                    <button class="variant-chip ${idx === 0 ? 'active' : ''}" 
                                            onclick="selectVariant('${p.id}', '${v}', this)">
                                        ${v}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}

                        <div style="margin-top: 1rem; display: flex; gap: 0.5rem; font-size: 0.8rem; color: var(--text-secondary);">
                            <span style="background: rgba(255,255,255,0.05); padding: 0.2rem 0.6rem; border-radius: 4px; border: 1px solid var(--glass-border);">${p.color || p.category}</span>
                        </div>
                    </div>
                </a>
                
                ${!isAdminUser ? `
                <div style="padding: 0 1.5rem 1.5rem 1.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.6rem;">
                        <button class="catalog-qty-btn" data-id="${p.id}" data-delta="-1">−</button>
                        <span class="catalog-qty-display" data-id="${p.id}">1</span>
                        <button class="catalog-qty-btn" data-id="${p.id}" data-delta="1">+</button>
                        <button class="btn btn-secondary catalog-add-btn" 
                                id="add-btn-${p.id}"
                                data-id="${p.id}" 
                                data-name="${p.name.replace(/"/g, '&quot;')}" 
                                data-img="${p.img}" 
                                data-cat="${p.category}"
                                data-variant="${p.variants && p.variants.length > 0 ? p.variants[0] : ''}"
                                ${isOOS ? 'disabled' : ''}>
                            <i class="fas fa-cart-plus"></i> <span id="add-text-${p.id}">${isOOS ? 'Sin Stock' : 'Agregar'}</span>
                        </button>
                    </div>
                </div>
                ` : ''}

                ${isAdminUser ? `
                <div class="admin-controls" style="display: flex; gap: 0.5rem; padding: 0 1.5rem 1.5rem 1.5rem;">
                    <button class="btn btn-warning" onclick="event.preventDefault(); openStockManager('${p.id}')" style="flex: 1; padding: 0.5rem;" title="Gestionar Stock">
                       <i class="fas fa-boxes"></i>
                    </button>
                    <button class="btn btn-secondary" onclick="event.preventDefault(); editProduct('${p.id}')" style="flex: 1; padding: 0.5rem;" title="Editar">
                       <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="event.preventDefault(); deleteProduct('${p.id}')" style="flex: 1; padding: 0.5rem;" title="Eliminar">
                       <i class="fas fa-trash"></i>
                    </button>
                </div>` : ''}
            `;

            grid.appendChild(card);
        });
    }

    stats.innerText = `Mostrando ${paginated.length} de ${filtered.length} productos (Página ${currentPage} de ${totalPages || 1})`;
    renderPagination(totalPages);

    // Re-initialize animations for new elements
    if (typeof window.initAnimations === 'function') {
        setTimeout(window.initAnimations, 50);
    }
    // Reset qty displays to match cardQtyMap (which persists across renders)
    cardQtyMap.forEach((qty, id) => {
        grid.querySelectorAll(`.catalog-qty-display[data-id="${id}"]`).forEach(el => {
            el.textContent = qty;
        });
    });
}

function renderPagination(totalPages) {
    const controls = document.getElementById('pagination-controls');
    controls.innerHTML = '';

    if (totalPages <= 1) return;

    // Prev Button
    const prev = document.createElement('button');
    prev.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prev.disabled = currentPage === 1;
    prev.onclick = () => { currentPage--; renderProducts(); window.scrollTo({ top: 400, behavior: 'smooth' }); };
    controls.appendChild(prev);

    // Page indicator
    const indicator = document.createElement('span');
    indicator.style.color = 'var(--text-secondary)';
    indicator.innerText = `${currentPage} / ${totalPages}`;
    controls.appendChild(indicator);

    // Next Button
    const next = document.createElement('button');
    next.innerHTML = '<i class="fas fa-chevron-right"></i>';
    next.disabled = currentPage === totalPages;
    next.onclick = () => { currentPage++; renderProducts(); window.scrollTo({ top: 400, behavior: 'smooth' }); };
    controls.appendChild(next);
}

// Admin Functions
window.editProduct = window.editProduct || async function (id) {
    const p = productsData.find(x => x.id === id);
    if (!p) return;

    document.getElementById('p-id').value = p.id;
    document.getElementById('p-name').value = p.name;
    document.getElementById('p-category').value = p.category || '';
    document.getElementById('p-provider').value = p.provider || '';
    document.getElementById('p-color').value = p.color || '';
    document.getElementById('p-size').value = p.variants ? p.variants.join(', ') : (p.size || '');
    document.getElementById('p-desc').value = p.desc;
    document.getElementById('p-img').value = p.img || '';

    document.getElementById('modal-product-title').innerText = 'Editar Producto';

    // Pre-fill variant image slots with existing variantImgs
    renderVariantImageSlots(p.variants || [], p.variantImgs || {});

    document.getElementById('addModal').style.display = 'flex';
}

// Stock Management
window.openStockManager = function(id) {
    const p = productsData.find(x => x.id === id);
    if (!p) return;
    
    document.getElementById('stock-p-id').value = p.id;
    document.getElementById('stock-modal-title').innerText = `Stock: ${p.name}`;
    
    // Si la modal o el contenedor no existen es porque puede que esta vista no las implemente 
    // pero evitamos el error
    const container = document.getElementById('stock-variants-container');
    if (!container) return;
    container.innerHTML = '';
    
    const outOfStock = p.outOfStock || [];
    
    if (p.variants && p.variants.length > 0) {
        p.variants.forEach(v => {
            const isOutOfStock = outOfStock.includes(v);
            container.innerHTML += `
                <div class="stock-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.8rem; border-bottom: 1px solid var(--glass-border);">
                    <span style="font-size: 1rem; color: white;">${v}</span>
                    <label class="switch">
                        <input type="checkbox" class="stock-toggle-input" value="${v}" ${!isOutOfStock ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                </div>
            `;
        });
    } else {
        const isOutOfStock = outOfStock === true || (Array.isArray(outOfStock) && outOfStock.includes('main'));
        container.innerHTML += `
            <div class="stock-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.8rem; border-bottom: 1px solid var(--glass-border);">
                <span style="font-size: 1rem; color: white;">Producto Único</span>
                <label class="switch">
                    <input type="checkbox" class="stock-toggle-input" value="main" ${!isOutOfStock ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
        `;
    }
    
    document.getElementById('stockModal').style.display = 'flex';
};

window.deleteProduct = window.deleteProduct || async function (id) {
    if (confirm("¿Estás seguro de que deseas eliminar este producto?")) {
        const p = productsData.find(x => x.id === id);
        if(p) {
            try {
                await deleteDoc(doc(db, "products", String(id)));
                productsData = productsData.filter(x => x.id !== id);
                renderProducts();
                renderFilters();
            } catch (error) {
                console.error("Error deleting document: ", error);
                alert("Hubo un error al eliminar.");
            }
        }
    }
};

// Render dynamic filters based on current productsData
function renderFilters() {
    const catsContainer = document.getElementById('filter-categories');
    const provsContainer = document.getElementById('filter-providers');
    const colorsContainer = document.getElementById('filter-colors');

    if (!catsContainer || !provsContainer || !colorsContainer) return; // Exit if not in catalog page

    // Get unique sorted lists
    const uniqueCats = [...new Set(productsData.map(p => p.category))].sort();
    const uniqueProvs = [...new Set(productsData.map(p => p.provider))].sort();
    const uniqueColors = [...new Set(productsData.map(p => p.color))].sort();

    // Helper to generate checkboxes
    const generateCheckboxes = (container, items, selectedSet, filterType) => {
        container.innerHTML = '';
        items.forEach(item => {
            const label = document.createElement('label');
            label.className = 'filter-checkbox';
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.gap = '0.5rem';
            label.style.cursor = 'pointer';
            label.style.marginBottom = '0.4rem';
            label.style.fontSize = '0.95rem';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = item;
            checkbox.checked = selectedSet.has(item);

            // Update filter on change
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    selectedSet.add(item);
                } else {
                    selectedSet.delete(item);
                }
                currentPage = 1;
                renderProducts();
            });

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(item));
            container.appendChild(label);
        });
    };

    generateCheckboxes(catsContainer, uniqueCats, selectedCategories, 'category');
    generateCheckboxes(provsContainer, uniqueProvs, selectedProviders, 'provider');
    generateCheckboxes(colorsContainer, uniqueColors, selectedColors, 'color');

    // Also update horizontal dropdowns
    const hCats = document.getElementById('h-filter-categories');
    const hProvs = document.getElementById('h-filter-providers');
    
    if (hCats && hProvs) {
        // Categories Dropdown
        hCats.innerHTML = '<div class="dropdown-item" onclick="selectedCategories.clear(); currentPage=1; renderProducts(); renderFilters();">Todas las Categorías</div>';
        uniqueCats.forEach(cat => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.innerText = cat;
            item.onclick = () => {
                selectedCategories.clear();
                selectedCategories.add(cat);
                currentPage = 1;
                renderProducts();
                renderFilters();
            };
            hCats.appendChild(item);
        });

        // Providers Dropdown
        hProvs.innerHTML = '<div class="dropdown-item" onclick="selectedProviders.clear(); currentPage=1; renderProducts(); renderFilters();">Todas las Marcas</div>';
        uniqueProvs.forEach(prov => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.innerText = prov;
            item.onclick = () => {
                selectedProviders.clear();
                selectedProviders.add(prov);
                currentPage = 1;
                renderProducts();
                renderFilters();
            };
            hProvs.appendChild(item);
        });
    }
}

// Clear all filters
function clearFilters() {
    selectedCategories.clear();
    selectedProviders.clear();
    selectedColors.clear();
    document.getElementById('search-input').value = '';
    currentSearch = '';
    currentPage = 1;
    renderFilters(); // Reset visual checkboxes
    renderProducts();
}

document.addEventListener('DOMContentLoaded', () => {
    initializeProducts();
    renderFilters();
    renderProducts();

    // DOM Elements
    const searchInput = document.getElementById('search-input');
    const btnAdd = document.getElementById('btn-add-product');
    const modal = document.getElementById('addModal');
    const btnCloseModal = document.getElementById('close-modal');
    const addForm = document.getElementById('add-product-form');

    // Admin display
    if (isAdminUser && btnAdd) {
        btnAdd.style.display = 'inline-block';
    }

    // Search
    let timeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            currentSearch = e.target.value;
            currentPage = 1;
            renderProducts();
        }, 300); // 300ms debounce
    });

    // Modal behavior
    if (btnAdd) {
        btnAdd.addEventListener('click', () => {
            document.getElementById('p-id').value = '';
            document.getElementById('modal-product-title').innerText = 'Añadir Nuevo Producto';
            if (addForm) addForm.reset();
            // Reset variant image section
            const viSection = document.getElementById('variant-imgs-section');
            const viContainer = document.getElementById('variant-imgs-container');
            if (viSection) viSection.style.display = 'none';
            if (viContainer) viContainer.innerHTML = '';
            modal.style.display = 'flex';
        });
        btnCloseModal.addEventListener('click', () => modal.style.display = 'none');
        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    }

    // Listener p-size → regenerar slots de imagen de variante en tiempo real
    const pSizeInput = document.getElementById('p-size');
    if (pSizeInput) {
        pSizeInput.addEventListener('input', function() {
            const variants = splitVariants(this.value);
            const existingImgs = {};
            document.querySelectorAll('.variant-img-slot').forEach(slot => {
                const url = slot.querySelector('.vi-url')?.value.trim();
                if (url) existingImgs[slot.dataset.variant] = url;
            });
            renderVariantImageSlots(variants, existingImgs);
        });
    }

    // Stock Modal behavior
    const stockModal = document.getElementById('stockModal');
    const btnCloseStockModal = document.getElementById('close-stock-modal');
    const stockForm = document.getElementById('stock-form');
    
    if (stockModal) {
        btnCloseStockModal.addEventListener('click', () => stockModal.style.display = 'none');
        window.addEventListener('click', (e) => {
            if (e.target === stockModal) stockModal.style.display = 'none';
        });
        
        stockForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = stockForm.querySelector('button[type="submit"]');
            btnSubmit.disabled = true;
            btnSubmit.innerText = 'Guardando...';
            
            try {
                const id = document.getElementById('stock-p-id').value;
                const pIndex = productsData.findIndex(x => x.id === id);
                if (pIndex !== -1) {
                    const checkboxes = stockForm.querySelectorAll('.stock-toggle-input');
                    let newOutOfStock = [];
                    let hasVariants = productsData[pIndex].variants && productsData[pIndex].variants.length > 0;
                    
                    checkboxes.forEach(cb => {
                        if (!cb.checked) { // Not checked = out of stock
                            newOutOfStock.push(cb.value);
                        }
                    });
                    
                    if (!hasVariants) {
                        productsData[pIndex].outOfStock = newOutOfStock.includes('main') ? true : false;
                    } else {
                        productsData[pIndex].outOfStock = newOutOfStock;
                    }
                    
                    await saveProduct(productsData[pIndex]);
                    renderProducts();
                }
                stockModal.style.display = 'none';
            } catch (error) {
                console.error("Error al guardar stock:", error);
                alert("Hubo un error al guardar el estado del stock.");
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerText = 'Guardar Stock';
            }
        });
    }

    // Clear filters behavior
    const btnClearFilters = document.getElementById('btn-clear-filters');
    if (btnClearFilters) {
        btnClearFilters.addEventListener('click', clearFilters);
    }

    // ── Catalog qty/add event delegation (registered ONCE here) ──
    const catalogGrid = document.getElementById('products-grid');
    if (catalogGrid) {
        catalogGrid.addEventListener('click', function(e) {
            // Qty +/-
            const qtyBtn = e.target.closest('.catalog-qty-btn');
            if (qtyBtn) {
                e.preventDefault();
                const id = qtyBtn.dataset.id;
                const delta = parseInt(qtyBtn.dataset.delta, 10);
                let current = cardQtyMap.get(id) || 1;
                current = Math.max(1, current + delta);
                cardQtyMap.set(id, current);
                catalogGrid.querySelectorAll(`.catalog-qty-display[data-id="${id}"]`).forEach(el => {
                    el.textContent = current;
                });
                return;
            }
            // Add to cart
            const addBtn = e.target.closest('.catalog-add-btn');
            if (addBtn) {
                e.preventDefault();
                const id = addBtn.dataset.id;
                const name = addBtn.dataset.name;
                const img = addBtn.dataset.img;
                const cat = addBtn.dataset.cat;
                const variant = addBtn.dataset.variant || ''; // Extraer variante seleccionada
                const qty = cardQtyMap.get(id) || 1;
                
                window.addToCart(id, name, img, cat, qty, variant);
                // Reset display after adding
                cardQtyMap.set(id, 1);
                catalogGrid.querySelectorAll(`.catalog-qty-display[data-id="${id}"]`).forEach(el => {
                    el.textContent = '1';
                });
            }
        });
    }

    // Add/Edit Product
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = addForm.querySelector('button[type="submit"]');
            btnSubmit.disabled = true;
            btnSubmit.innerText = 'Guardando...';

            try {
                const editId = document.getElementById('p-id').value;
                const name = document.getElementById('p-name').value;
                const category = document.getElementById('p-category').value;
                const provider = document.getElementById('p-provider').value;
                const color = document.getElementById('p-color').value;
                const size = document.getElementById('p-size').value;
                const variants = splitVariants(size);
                const desc = document.getElementById('p-desc').value;
                
                // Allow file upload or URL → both get uploaded to Cloudinary
                const imgFileInput = document.getElementById('p-img-file');
                let img = document.getElementById('p-img').value.trim();

                if (imgFileInput && imgFileInput.files.length > 0) {
                    // File selected: upload to Cloudinary
                    btnSubmit.innerText = 'Subiendo imagen...';
                    const uploaded = await uploadToCloudinary(imgFileInput.files[0], 'imagen principal');
                    if (uploaded) img = uploaded;
                } else if (img && img.startsWith('http')) {
                    // URL pasted: re-host on Cloudinary
                    btnSubmit.innerText = 'Alojando imagen en Cloudinary...';
                    img = await uploadToCloudinary(img, 'imagen principal (URL)');
                } else if (!img) {
                    img = '1.png';
                }

                // Collect variant images from slots and upload if files selected
                btnSubmit.innerText = 'Guardando variantes...';
                const variantImgs = {};
                const slots = document.querySelectorAll('.variant-img-slot');
                for (const slot of slots) {
                    const varName = slot.dataset.variant;
                    const fileInput = slot.querySelector('.vi-file');
                    const urlInput = slot.querySelector('.vi-url');
                    if (fileInput && fileInput.files.length > 0) {
                        btnSubmit.innerText = `Subiendo imagen de "${varName}"...`;
                        const fd = new FormData();
                        fd.append('file', fileInput.files[0]);
                        fd.append('upload_preset', CLOUDINARY_PRESET);
                        const vRes = await fetch(CLOUDINARY_URL, { method: 'POST', body: fd });
                        if (vRes.ok) {
                            const vData = await vRes.json();
                            variantImgs[varName] = vData.secure_url;
                        }
                    } else if (urlInput && urlInput.value.trim()) {
                        // URL pasted: re-host on Cloudinary
                        btnSubmit.innerText = `Alojando imagen de "${varName}"...`;
                        variantImgs[varName] = await uploadToCloudinary(urlInput.value.trim(), varName);
                    }
                }

                if (editId) {
                    // Edit existing
                    const idx = productsData.findIndex(p => p.id == editId);
                    if (idx !== -1) {
                        productsData[idx].name = name;
                        productsData[idx].category = category;
                        productsData[idx].provider = provider;
                        productsData[idx].color = color;
                        productsData[idx].variants = variants;
                        productsData[idx].desc = desc;
                        productsData[idx].img = img;
                        if (Object.keys(variantImgs).length > 0) {
                            productsData[idx].variantImgs = { ...(productsData[idx].variantImgs || {}), ...variantImgs };
                        }
                        await saveProduct(productsData[idx]);
                    }
                } else {
                    // Add new
                    const newId = 'p_' + Date.now();
                    const newObj = {
                        id: newId,
                        name,
                        desc,
                        category,
                        provider,
                        color,
                        variants,
                        img: img || '1.png',
                        ...(Object.keys(variantImgs).length > 0 ? { variantImgs } : {})
                    };
                    await saveProduct(newObj);
                    productsData.push(newObj);
                    currentPage = 1;
                }

                modal.style.display = 'none';
                addForm.reset();
                document.getElementById('variant-imgs-container').innerHTML = '';
                renderFilters();
                renderProducts();
                } catch(error) {
                    console.error("Error detallado al guardar producto: ", error);
                    alert("Error al guardar el producto: " + error.message);
                } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerText = 'Guardar Producto';
                if(document.getElementById('p-img-file')) {
                    document.getElementById('p-img-file').value = '';
                }
            }
        });
    }
});

// ─── Variant Image Slots ────────────────────────────────────────────────────
function renderVariantImageSlots(variantList, existingImgs) {
    const container = document.getElementById('variant-imgs-container');
    const section = document.getElementById('variant-imgs-section');
    if (!container) return;

    // Show/hide the whole section
    if (!variantList || variantList.length === 0) {
        container.innerHTML = '';
        if (section) section.style.display = 'none';
        return;
    }
    if (section) section.style.display = 'block';

    container.innerHTML = '';
    variantList.forEach(v => {
        const existing = (existingImgs && existingImgs[v]) || '';
        const slot = document.createElement('div');
        slot.className = 'variant-img-slot';
        slot.dataset.variant = v;
        slot.style.cssText = 'background: rgba(255,255,255,0.04); border: 1px solid var(--glass-border); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.5rem;';
        slot.innerHTML = `
            <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.5rem;">
                <img class="vi-preview" src="${existing}" 
                     style="width:48px;height:48px;object-fit:contain;border-radius:4px;background:#fff;border:1px solid #444; ${existing ? '' : 'display:none;'}">
                <span style="font-size:0.9rem;font-weight:600;color:var(--accent-color);flex:1;">${v}</span>
            </div>
            <input type="file" class="vi-file" accept="image/*" style="font-size:0.82rem;margin-bottom:0.3rem;">
            <input type="text" class="vi-url" value="${existing}" placeholder="O pegar URL (https://...)" 
                   style="width:100%;padding:0.4rem 0.6rem;border-radius:6px;border:1px solid var(--glass-border);background:rgba(255,255,255,0.05);color:white;font-size:0.82rem;">
        `;

        // File preview
        slot.querySelector('.vi-file').addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                const prev = slot.querySelector('.vi-preview');
                prev.src = ev.target.result;
                prev.style.display = 'block';
            };
            reader.readAsDataURL(file);
        });

        // URL preview
        slot.querySelector('.vi-url').addEventListener('input', e => {
            const prev = slot.querySelector('.vi-preview');
            prev.src = e.target.value.trim();
            prev.style.display = e.target.value.trim() ? 'block' : 'none';
        });

        container.appendChild(slot);
    });
}
window.renderVariantImageSlots = renderVariantImageSlots;
