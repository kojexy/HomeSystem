package com.kojexy.homesystem;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Needed by the SystemBars inset handling in capacitor.config.ts (automatic from Capacitor 9).
        EdgeToEdge.enable(this);
    }
}
