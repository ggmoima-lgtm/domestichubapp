import { useState } from "react";
import { Bell } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "./ui/alert-dialog";
import { toast } from "sonner";

interface PushNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PushNotificationDialog = ({ open, onOpenChange }: PushNotificationDialogProps) => {
  const [requesting, setRequesting] = useState(false);

  const handleEnable = async () => {
    if (!("Notification" in window)) {
      toast.error("Push notifications are not supported on this device");
      onOpenChange(false);
      return;
    }
    setRequesting(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        toast.success("Push notifications enabled!");
      } else {
        toast("You can enable notifications later in your profile settings.");
      }
    } catch {
      toast.error("Could not request notification permission");
    } finally {
      setRequesting(false);
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-3xl max-w-sm mx-auto">
        <AlertDialogHeader className="items-center text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <Bell size={32} className="text-primary" />
          </div>
          <AlertDialogTitle className="text-lg">Enable Push Notifications</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            Stay updated on new messages, job matches, and important alerts. You can change this anytime in settings.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction
            onClick={handleEnable}
            disabled={requesting}
            className="w-full rounded-xl h-12"
          >
            {requesting ? "Enabling..." : "Enable Notifications"}
          </AlertDialogAction>
          <AlertDialogCancel className="w-full rounded-xl h-12 mt-0">
            Not Now
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PushNotificationDialog;
