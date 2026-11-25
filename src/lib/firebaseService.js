import {
    storage,
    storageRef,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
} from '@/lib/firebase'

class FirebaseService {
    async uploadFile(file, folder = 'videos', filename = null, onProgress) {
        if (!file) return null
        const name = filename || `${Date.now()}_${file.name}`
        const path = `${folder}/${name}`
        const ref = storageRef(storage, path)

        return new Promise((resolve, reject) => {
            const task = uploadBytesResumable(ref, file)
            task.on(
                'state_changed',
                (snapshot) => {
                    const percent = Math.round(
                        (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                    )
                    if (typeof onProgress === 'function') onProgress(percent)
                },
                (error) => reject(error),
                async () => {
                    try {
                        const url = await getDownloadURL(task.snapshot.ref)
                        resolve({url, path})
                    } catch (err) {
                        reject(err)
                    }
                }
            )
        })
    }

    async deleteFile(fileUrlOrPath) {
        if (!fileUrlOrPath) return false
        try {
            const ref = storageRef(storage, fileUrlOrPath)
            await deleteObject(ref)
            return true
        } catch (error) {
            console.warn('Error al eliminar archivo de Firebase Storage:', error)
            return false
        }
    }
}

export default new FirebaseService()

