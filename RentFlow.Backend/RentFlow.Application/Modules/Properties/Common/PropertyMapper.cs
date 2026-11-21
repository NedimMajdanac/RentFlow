using RentFlow.Domain.Entities.Property;
using RentFlow.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Properties.Common
{
    internal static class PropertyMapper
    {
        /// <summary>
        /// Copies the command onto the entity. Fields that make no sense for the type are cleared:
        /// building fields for land, plot area for everything except houses and land.
        /// </summary>
        public static void Apply(PropertyEntity e, PropertyCommandBase c)
        {
            var isLand = c.PropertyType == PropertyType.Land;

            e.CityId = c.CityId;
            e.PropertyType = c.PropertyType;
            e.Address = c.Address.Trim();
            e.Description = c.Description.TrimToNull();
            e.AreaM2 = c.AreaM2;
            e.PlotAreaM2 = c.PropertyType is PropertyType.House or PropertyType.Land ? c.PlotAreaM2 : null;

            e.Rooms = isLand ? null : c.Rooms;
            e.Bathrooms = isLand ? null : c.Bathrooms;
            e.Floor = isLand ? null : c.Floor;
            e.TotalFloors = isLand ? null : c.TotalFloors;
            e.YearBuilt = isLand ? null : c.YearBuilt;
            e.HeatingType = isLand ? null : c.HeatingType;
            e.FurnishedStatus = isLand ? null : c.FurnishedStatus;
            e.Condition = isLand ? null : c.Condition;

            e.Latitude = c.Latitude;
            e.Longitude = c.Longitude;
        }
    }
}
