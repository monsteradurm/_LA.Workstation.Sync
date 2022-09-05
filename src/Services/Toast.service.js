export class ToastService {
    static _ToastReference = null;

    static get Toast() { return ToastService._ToastReference; }
    static SetToaster = (ref) => ToastService._ToastReference = ref.current;

    static SendSuccess = (message) => {
        ToastService.Toast.show({life: 3000, severity: 'success', summary: 'Success!', detail: message});
    }

    static SendError = (message) => {
        ToastService.Toast.show({life: 3000, severity: 'error', summary: 'Oops!', detail: message});
    }

    static SendWarning = (message) => {
        ToastService.Toast.show({life: 3000, severity: 'warning', summary: 'Warning!', detail: message});
    }

    static SendInfo = (title, message) => {
        ToastService.Toast.show({life: 3000, severity: 'info', summary: title, detail: message});
    }
}