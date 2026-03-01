using System.Text.Json.Serialization;

namespace CarrierCommand.Models;

public class RadarBlip
{
    [JsonPropertyName("x")]
    public double X { get; set; }
    [JsonPropertyName("y")]
    public double Y { get; set; }
    [JsonPropertyName("opacity")]
    public double Opacity { get; set; }
    [JsonPropertyName("isSelected")]
    public bool IsSelected { get; set; }
    [JsonPropertyName("isOffRadar")]
    public bool IsOffRadar { get; set; }
    [JsonPropertyName("isBuilding")]
    public bool IsBuilding { get; set; }
    [JsonPropertyName("id")]
    public string Id { get; set; }
    [JsonPropertyName("hp")]
    public double Hp { get; set; }
    [JsonPropertyName("maxHp")]
    public double MaxHp { get; set; }
    [JsonPropertyName("type")]
    public string Type { get; set; }
}
